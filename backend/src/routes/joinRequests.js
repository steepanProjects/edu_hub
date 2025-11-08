import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/join-requests/tutor?userId=UID  -> pending requests for classrooms where user is tutor
router.get('/tutor', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const { data, error } = await supabase
      .from('join_requests')
      .select(`
        id,
        classroom_id,
        student_id,
        status,
        created_at,
        classrooms ( id, name, tutor_id ),
        users ( id, full_name, email )
      `)
      .eq('status', 'pending');

    if (error) return res.status(500).json({ error: error.message });

    const mine = (data || []).filter(r => r.classrooms?.tutor_id === userId);
    res.json(mine);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/join-requests/mine?userId=UID -> pending requests initiated by user
router.get('/mine', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const { data, error } = await supabase
      .from('join_requests')
      .select(`
        id,
        classroom_id,
        status,
        created_at,
        classrooms (
          id,
          name,
          tutor_id,
          users:users!tutor_id (id, full_name, email)
        )
      `)
      .eq('student_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/join-requests/:id -> single join request with classroom context
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase
      .from('join_requests')
      .select('id, classroom_id, student_id, status, created_at, classrooms ( id, name, tutor_id )')
      .eq('id', id)
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/join-requests/:id/accept
router.post('/:id/accept', async (req, res) => {
  try {
    const id = req.params.id;
    const { classroom_id, student_id } = req.body || {};

    const { error: updErr } = await supabase.from('join_requests').update({ status: 'accepted' }).eq('id', id);
    if (updErr) return res.status(500).json({ error: updErr.message });

    const { error: insErr } = await supabase.from('classroom_members').insert({
      classroom_id,
      user_id: student_id,
      role: 'student'
    });
    if (insErr) return res.status(500).json({ error: insErr.message });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/join-requests/:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    const id = req.params.id;
    const { classroom_id, student_id, classroom_name } = req.body || {};

    const { error: updErr } = await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', id);
    if (updErr) return res.status(500).json({ error: updErr.message });

    // notify student
    try {
      await supabase.from('notifications').insert({
        user_id: student_id,
        type: 'join_request_rejected',
        payload: {
          classroom_id,
          classroom_name
        },
        read: false,
        created_at: new Date().toISOString()
      });
    } catch {}

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/join-requests/:id/cancel  (student cancels own pending)
router.post('/:id/cancel', async (req, res) => {
  try {
    const id = req.params.id;
    const { classroom_id, classroom_name, tutor_id, student_id, student_name } = req.body || {};

    const { error: updErr } = await supabase
      .from('join_requests')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (updErr) return res.status(500).json({ error: updErr.message });

    // notify tutor
    try {
      if (tutor_id) {
        await supabase.from('notifications').insert({
          user_id: tutor_id,
          type: 'join_request_cancelled',
          payload: {
            classroom_id,
            classroom_name,
            student_id,
            student_name
          },
          read: false,
          created_at: new Date().toISOString()
        });
      }
    } catch {}

    // notify student
    try {
      await supabase.from('notifications').insert({
        user_id: student_id,
        type: 'join_request_withdrawn',
        payload: {
          classroom_id,
          classroom_name
        },
        read: false,
        created_at: new Date().toISOString()
      });
    } catch {}

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
