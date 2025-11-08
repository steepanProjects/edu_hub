import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

function mailConfigStatus() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  if (host && port && user && pass) return { configured: true, provider: 'smtp', fromEmail };
  if (resendKey && fromEmail) return { configured: true, provider: 'resend', fromEmail };
  return { configured: false, provider: null, fromEmail: fromEmail || null };
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendMail({ to, subject, text }) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.FROM_EMAIL || 'no-reply@eduhub.local';
  const fromName = process.env.SMTP_FROM_NAME || '';
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const secure = process.env.SMTP_SECURE === 'true';

  // If SMTP not configured, try Resend API as a fallback
  if (!host || !port || !user || !pass) {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to, subject, text })
      });
      if (!r.ok) {
        const body = await r.text();
        throw new Error(`Resend failed: ${r.status} ${body}`);
      }
      return { ok: true, provider: 'resend' };
    } else {
      const missing = [];
      if (!host) missing.push('SMTP_HOST');
      if (!port) missing.push('SMTP_PORT');
      if (!user) missing.push('SMTP_USER');
      if (!pass) missing.push('SMTP_PASS');
      console.error('[MAIL] No SMTP or RESEND_API_KEY configured. Missing:', missing.join(', ') || 'unknown');
      return { ok: false, reason: 'mail_not_configured' };
    }
  }

  // dynamic import to avoid requiring nodemailer when not configured
  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // pool & timeouts to reduce latency and fail fast
    pool: true,
    maxConnections: 2,
    maxMessages: 20,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000
  });
  await transporter.sendMail({ from, to, subject, text });
  return { ok: true };
}

// POST /api/auth/request-email-otp { email }
router.post('/request-email-otp', async (req, res) => {
  try {
    const emailRaw = (req.body || {}).email;
    if (!emailRaw) return res.status(400).json({ error: 'email is required' });
    const email = String(emailRaw).trim().toLowerCase();

    // Reuse active code if one exists and is not expired/consumed to avoid rotating codes
    const { data: existing, error: selErr } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    let code;
    let expires_at;
    const now = Date.now();
    if (!selErr && existing) {
      const exp = existing.expires_at ? new Date(existing.expires_at).getTime() : 0;
      const active = !existing.consumed && exp && now < exp;
      if (active) {
        // Reuse existing active code, optionally extend expiry a bit
        code = String(existing.code);
        expires_at = existing.expires_at; // keep as-is
      }
    }

    if (!code) {
      code = genCode();
      expires_at = new Date(now + 10 * 60 * 1000).toISOString(); // 10 minutes
      const { error: upsertErr } = await supabase
        .from('email_otps')
        .upsert({ email, code, expires_at, consumed: false, attempts: 0 }, { onConflict: 'email' });
      if (upsertErr) return res.status(500).json({ error: upsertErr.message });
    }

    const subject = 'Your EduHub verification code';
    const text = `Your verification code is ${code}. It expires in 10 minutes.`;

    const cfg = mailConfigStatus();
    if (!cfg.configured) {
      console.error('[MAIL] Not configured in this environment. Set SMTP_* or RESEND_API_KEY and FROM_EMAIL');
      return res.status(500).json({ error: 'Email provider not configured on server', hint: 'Set SMTP_* or RESEND_API_KEY and FROM_EMAIL' });
    }

    // Send mail in background to avoid blocking the response
    // Any failure will be logged but won't block the UI
    sendMail({ to: email, subject, text }).catch((e) => {
      console.error('sendMail failed:', e?.message || e);
    });

    res.json({ ok: true, mailProvider: cfg.provider });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Diagnostics: check mail configuration status
router.get('/mail-config', (_req, res) => {
  const cfg = mailConfigStatus();
  res.json(cfg);
});

// POST /api/auth/verify-email-otp { email, code }
router.post('/verify-email-otp', async (req, res) => {
  try {
    const emailRaw = (req.body || {}).email;
    const code = (req.body || {}).code;
    if (!emailRaw || !code) return res.status(400).json({ error: 'email and code are required' });
    const email = String(emailRaw).trim().toLowerCase();

    const { data: row, error } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(400).json({ error: 'Invalid code' });

    const now = Date.now();
    const exp = row.expires_at ? new Date(row.expires_at).getTime() : 0;
    if (row.consumed) return res.status(400).json({ error: 'Code already used' });
    if (row.attempts >= 5) return res.status(400).json({ error: 'Too many attempts' });
    if (!exp || now > exp) return res.status(400).json({ error: 'Code expired' });

    if (String(row.code) !== String(code)) {
      await supabase.from('email_otps').update({ attempts: (row.attempts || 0) + 1 }).eq('email', email);
      return res.status(400).json({ error: 'Invalid code' });
    }

    await supabase.from('email_otps').delete().eq('email', email);
    res.json({ verified: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
