import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// POST /api/quizzes
// { classroom_id, created_by, title, description?, time_limit? }
router.post('/', async (req, res) => {
  try {
    const { classroom_id, created_by, title, description, time_limit } = req.body || {};
    if (!classroom_id || !created_by || !title) return res.status(400).json({ error: 'classroom_id, created_by, title are required' });

    await supabase.from('users').upsert({ id: created_by }, { onConflict: 'id' });

    const { data, error } = await supabase
      .from('quizzes')
      .insert({ classroom_id, created_by, title, description: description || null, time_limit: time_limit ?? null })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
