import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// POST /api/assignments
// { classroom_id, created_by, title, description?, due_date?, points_possible? }
router.post('/', async (req, res) => {
  try {
    const { classroom_id, created_by, title, description, due_date, points_possible } = req.body || {};
    if (!classroom_id || !created_by || !title) return res.status(400).json({ error: 'classroom_id, created_by, title are required' });

    // Ensure user exists
    await supabase.from('users').upsert({ id: created_by }, { onConflict: 'id' });

    // Ensure membership as tutor (best-effort)
    try {
      const { data: cls } = await supabase.from('classrooms').select('tutor_id').eq('id', classroom_id).single();
      if (cls?.tutor_id === created_by) {
        await supabase.from('classroom_members').upsert({ classroom_id, user_id: created_by, role: 'tutor' }, { onConflict: 'classroom_id,user_id' });
      }
    } catch {}

    const { data, error } = await supabase
      .from('assignments')
      .insert({ classroom_id, created_by, title, description: description || null, due_date: due_date || null, points_possible: points_possible ?? null })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/assignments/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updates = {};
    if (typeof body.title === 'string') updates.title = body.title;
    if (typeof body.description !== 'undefined') updates.description = body.description || null;
    if (typeof body.points_possible !== 'undefined') {
      const n = Number(body.points_possible);
      updates.points_possible = Number.isFinite(n) ? n : null;
    }
    if (typeof body.due_date !== 'undefined') {
      if (!body.due_date) {
        updates.due_date = null;
      } else {
        const dt = new Date(body.due_date);
        if (Number.isNaN(dt.getTime())) {
          return res.status(400).json({ error: 'Invalid due_date' });
        }
        updates.due_date = dt.toISOString();
      }
    }

    // Ensure there is at least one field to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    let oldMax = undefined;
    try {
      const { data: before } = await supabase
        .from('assignments')
        .select('points_possible')
        .eq('id', id)
        .single();
      oldMax = before?.points_possible;
    } catch {}

    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select('*');
    if (error) return res.status(400).json({ error: error.message });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return res.status(404).json({ error: 'Assignment not found' });

    if (Object.prototype.hasOwnProperty.call(updates, 'points_possible') && Number.isFinite(updates.points_possible)) {
      const newMax = updates.points_possible;
      const canScale = Number.isFinite(oldMax) && oldMax > 0 && Number.isFinite(newMax) && newMax > 0 && oldMax !== newMax;
      if (canScale) {
        try {
          const { data: subs } = await supabase
            .from('assignment_submissions')
            .select('id, points_earned')
            .eq('assignment_id', id)
            .not('points_earned', 'is', null);
          for (const s of subs || []) {
            const scaled = Math.max(0, Math.min(newMax, Math.round((Number(s.points_earned) || 0) * (newMax / oldMax))));
            if (scaled !== s.points_earned) {
              await supabase
                .from('assignment_submissions')
                .update({ points_earned: scaled })
                .eq('id', s.id);
            }
          }
        } catch (scaleErr) {
          console.error('Failed to scale submission grades:', scaleErr?.message || scaleErr);
        }
      } else {
        try {
          await supabase
            .from('assignment_submissions')
            .update({ points_earned: newMax })
            .gt('points_earned', newMax)
            .eq('assignment_id', id);
        } catch (clampErr) {
          console.error('Failed to clamp submission grades:', clampErr?.message || clampErr);
        }
      }
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
