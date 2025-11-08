import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/classrooms/mine?userId=UID
router.get('/mine', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const { data, error } = await supabase
      .from('classroom_members')
      .select(`*, classrooms ( id, name, description, security_key, tutor_id, created_at )`)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/classrooms/:id/full?userId=UID
router.get('/:id/full', async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.query.userId;
    if (!id || !userId) return res.status(400).json({ error: 'id and userId are required' });

    // Classroom
    const { data: classroom, error: classroomErr } = await supabase.from('classrooms').select('*').eq('id', id).single();
    if (classroomErr) return res.status(404).json({ error: classroomErr.message });

    // Membership check
    const { data: membership, error: memErr } = await supabase
      .from('classroom_members')
      .select('*')
      .eq('classroom_id', id)
      .eq('user_id', userId)
      .single();
    if (memErr || !membership) return res.status(403).json({ error: 'Not a member' });

    // Members with users
    const { data: members, error: membersErr } = await supabase
      .from('classroom_members')
      .select('*, users ( id, full_name, email, role )')
      .eq('classroom_id', id);
    if (membersErr) return res.status(500).json({ error: membersErr.message });

    // Documents with users (best effort join)
    let { data: documents, error: documentsErr } = await supabase
      .from('documents')
      .select('*, users ( full_name )')
      .eq('classroom_id', id)
      .order('created_at', { ascending: false });
    if (documentsErr) {
      const { data: docsSimple } = await supabase
        .from('documents')
        .select('*')
        .eq('classroom_id', id)
        .order('created_at', { ascending: false });
      documents = docsSimple || [];
    }

    // Assignments with users
    const { data: assignments, error: assignmentsErr } = await supabase
      .from('assignments')
      .select('*, users ( full_name )')
      .eq('classroom_id', id)
      .order('created_at', { ascending: false });
    if (assignmentsErr) return res.status(500).json({ error: assignmentsErr.message });

    // Quizzes with users
    const { data: quizzes, error: quizzesErr } = await supabase
      .from('quizzes')
      .select('*, users ( full_name )')
      .eq('classroom_id', id)
      .order('created_at', { ascending: false });
    if (quizzesErr) return res.status(500).json({ error: quizzesErr.message });

    // Credits
    let userCredit = 0;
    let memberCredits = {};
    try {
      const ids = (assignments || []).map(a => a.id);
      if (ids.length > 0) {
        const { data: subsUser } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, points_earned, graded_at')
          .in('assignment_id', ids)
          .eq('student_id', userId);
        userCredit = (subsUser || [])
          .filter(s => s.points_earned != null && s.graded_at)
          .reduce((sum, s) => sum + (s.points_earned || 0), 0);

        const { data: subsAll } = await supabase
          .from('assignment_submissions')
          .select('student_id, points_earned, graded_at')
          .in('assignment_id', ids);
        (subsAll || []).forEach(s => {
          if (s.points_earned != null && s.graded_at) {
            memberCredits[s.student_id] = (memberCredits[s.student_id] || 0) + (s.points_earned || 0);
          }
        });
      }
    } catch {}

    res.json({ classroom, membership, members: members || [], documents: documents || [], assignments: assignments || [], quizzes: quizzes || [], userCredit, memberCredits });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/classrooms/create
// body: { name, description, security_key?, tutor_id, tutor_email?, tutor_full_name? }
router.post('/create', async (req, res) => {
  try {
    const { name, description, security_key, tutor_id, tutor_email, tutor_full_name } = req.body || {};
    if (!name || !tutor_id) return res.status(400).json({ error: 'name and tutor_id are required' });

    // Ensure tutor user row exists to satisfy FK; if not, insert minimal row
    if (tutor_id) {
      const { data: existingUser, error: findErr } = await supabase
        .from('users')
        .select('id')
        .eq('id', tutor_id)
        .maybeSingle();
      if (findErr) return res.status(400).json({ error: findErr.message });
      if (!existingUser) {
        const baseEmail = tutor_email && String(tutor_email).trim().toLowerCase();
        const safeName = tutor_full_name || tutor_id;
        // First try requested email; if unique violation, fall back to synthetic email to satisfy FK
        let insUserErr = null;
        if (baseEmail) {
          const resIns = await supabase
            .from('users')
            .insert({ id: tutor_id, email: baseEmail, full_name: safeName, role: 'tutor' });
          insUserErr = resIns.error || null;
        }
        if (insUserErr && /users_email_key/i.test(insUserErr.message)) {
          const fallbackEmail = `${tutor_id}@example.local`;
          const { error: resFallbackErr } = await supabase
            .from('users')
            .insert({ id: tutor_id, email: fallbackEmail, full_name: safeName, role: 'tutor' });
          insUserErr = resFallbackErr || null;
        }
        if (!baseEmail) {
          const fallbackEmail = `${tutor_id}@example.local`;
          const { error: resFallbackErr } = await supabase
            .from('users')
            .insert({ id: tutor_id, email: fallbackEmail, full_name: safeName, role: 'tutor' });
          insUserErr = resFallbackErr || null;
        }
        if (insUserErr) return res.status(400).json({ error: insUserErr.message });
      } else if (tutor_full_name || tutor_email) {
        // Best-effort update name/email/role
        await supabase
          .from('users')
          .update({
            ...(tutor_email ? { email: tutor_email } : {}),
            ...(tutor_full_name ? { full_name: tutor_full_name } : {}),
            role: 'tutor'
          })
          .eq('id', tutor_id);
      }
    }

    // Ensure unique key. If provided, validate uniqueness; else generate a unique key.
    const genKey = () => Math.random().toString(36).slice(2, 8).toUpperCase();
    let key = (security_key || genKey()).toUpperCase();
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await supabase
        .from('classrooms')
        .select('id')
        .eq('security_key', key);
      if (!exists || exists.length === 0) break;
      key = genKey();
    }
    const { data: finalExists } = await supabase
      .from('classrooms')
      .select('id')
      .eq('security_key', key);
    if (finalExists && finalExists.length > 0) return res.status(400).json({ error: 'Could not generate unique key' });

    // Create classroom
    const { data: created, error: createErr } = await supabase
      .from('classrooms')
      .insert({ name, description, security_key: key, tutor_id })
      .select()
      .single();
    if (createErr) return res.status(400).json({ error: createErr.message });

    // Add tutor membership
    const { error: memberErr } = await supabase
      .from('classroom_members')
      .insert({ classroom_id: created.id, user_id: tutor_id, role: 'tutor' });
    if (memberErr) return res.status(400).json({ error: memberErr.message });

    // Optional mirror info (best effort)
    try {
      await supabase.from('classroom_info').insert({ name, description, security_key: key, tutor_id });
    } catch {}

    res.status(201).json({ ...created, security_key: key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/classrooms/join  { security_key, user_id, student_name }
router.post('/join', async (req, res) => {
  try {
    const { security_key, user_id, student_name } = req.body;
    if (!security_key || !user_id) {
      return res.status(400).json({ error: 'security_key and user_id are required' });
    }

    // Find classroom by security key
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('security_key', security_key)
      .single();

    if (classroomError || !classroom) {
      return res.status(404).json({ error: 'Invalid security key' });
    }

    // Already a member?
    const { data: existingMember, error: memberError } = await supabase
      .from('classroom_members')
      .select('*')
      .eq('classroom_id', classroom.id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (memberError) return res.status(500).json({ error: memberError.message });
    if (existingMember) return res.status(400).json({ error: 'Already a member of this classroom' });

    // Existing pending/accepted request?
    const { data: existingReqs, error: reqError } = await supabase
      .from('join_requests')
      .select('id, status')
      .eq('classroom_id', classroom.id)
      .eq('student_id', user_id)
      .in('status', ['pending', 'accepted']);

    if (reqError) return res.status(500).json({ error: reqError.message });
    const hasPendingOrAccepted = (existingReqs || []).some(r => r.status === 'pending' || r.status === 'accepted');
    if (hasPendingOrAccepted) return res.status(400).json({ error: 'You already have a pending or approved request for this classroom.' });

    // Upsert join request (handles withdrawn/rejected)
    const { error: upsertError } = await supabase
      .from('join_requests')
      .upsert({
        classroom_id: classroom.id,
        student_id: user_id,
        status: 'pending',
        created_at: new Date().toISOString()
      }, { onConflict: 'classroom_id,student_id' });

    if (upsertError) return res.status(500).json({ error: upsertError.message });

    // Create notification for tutor (best-effort)
    try {
      await supabase.from('notifications').insert({
        user_id: classroom.tutor_id,
        type: 'join_request',
        payload: {
          classroom_id: classroom.id,
          classroom_name: classroom.name,
          student_id: user_id,
          student_name: student_name || user_id
        },
        read: false,
        created_at: new Date().toISOString()
      });
    } catch {}

    res.json({ ok: true, classroom });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/classroom-members  { classroom_id, user_id }
router.delete('/members', async (req, res) => {
  try {
    const { classroom_id, user_id } = req.body || {};
    if (!classroom_id || !user_id) return res.status(400).json({ error: 'classroom_id and user_id required' });
    const { error } = await supabase
      .from('classroom_members')
      .delete()
      .eq('classroom_id', classroom_id)
      .eq('user_id', user_id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/classrooms/:id  (tutor action: also remove memberships)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('classroom_members').delete().eq('classroom_id', id);
    const { error } = await supabase.from('classrooms').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
