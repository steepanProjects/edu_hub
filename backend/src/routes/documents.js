import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/documents/:id/view { user_id }
router.post('/:id/view', async (req, res) => {
  try {
    const id = req.params.id;
    const { user_id } = req.body || {};
    if (!id || !user_id) return res.status(400).json({ error: 'id and user_id are required' });

    const { error } = await supabase
      .from('document_views')
      .upsert({ document_id: id, user_id }, { onConflict: 'document_id,user_id' });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'id is required' });

    // Load the document to infer storage path from public URL (best-effort)
    const { data: doc, error: docErr } = await supabase.from('documents').select('*').eq('id', id).single();
    if (docErr) return res.status(404).json({ error: docErr.message });

    try {
      const url = String(doc.file_url || '');
      const marker = '/object/public/documents/';
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const storagePath = url.substring(idx + marker.length);
        await supabase.storage.from('documents').remove([storagePath]);
      }
    } catch {}

    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/documents/upload  (multipart)
// fields: classroom_id, uploaded_by, title, description?; file field name: file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { classroom_id, uploaded_by, title, description } = req.body || {};
    const file = req.file;
    if (!classroom_id || !uploaded_by || !title || !file) {
      return res.status(400).json({ error: 'classroom_id, uploaded_by, title and file are required' });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const path = `${classroom_id}/${fileName}`;
    const contentType = file.mimetype || 'application/octet-stream';

    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(path, file.buffer, { contentType, upsert: false });
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });

    const { data: urlData, error: urlErr } = await supabase.storage
      .from('documents')
      .getPublicUrl(path);
    if (urlErr) return res.status(400).json({ error: urlErr.message });

    const insertPayload = {
      classroom_id,
      uploaded_by,
      title,
      description: description || null,
      file_url: urlData?.publicUrl,
      file_name: file.originalname,
      file_type: contentType,
      file_size: file.size,
    };
    const { data, error } = await supabase
      .from('documents')
      .insert(insertPayload)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/documents/:id/views
router.get('/:id/views', async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase
      .from('document_views')
      .select('*, users ( full_name, email )')
      .eq('document_id', id)
      .order('viewed_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
