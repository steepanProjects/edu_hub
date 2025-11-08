const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize app once
try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendWithSendGrid(to, subject, text) {
  const cfg = functions.config();
  const key = cfg?.sendgrid?.key;
  const from = cfg?.sendgrid?.from;
  if (!key || !from) {
    console.log('[DEV] SendGrid not configured. Would send email:', { to, subject, text });
    return { ok: true, dev: true };
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: 'text/plain', value: text }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SendGrid error ${res.status}: ${body}`);
  }
}

exports.requestEmailOtp = functions.https.onCall(async (data, context) => {
  const email = (data?.email || '').toString().trim().toLowerCase();
  if (!email) throw new functions.https.HttpsError('invalid-argument', 'email required');

  const code = genCode();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);

  // One active record per email
  await db.collection('email_otps').doc(email).set({
    email,
    code,
    expiresAt,
    consumed: false,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const subject = 'Your verification code';
  const text = `Your verification code is ${code}. It expires in 10 minutes.`;
  await sendWithSendGrid(email, subject, text);
  return { ok: true };
});

exports.verifyEmailOtp = functions.https.onCall(async (data, context) => {
  const email = (data?.email || '').toString().trim().toLowerCase();
  const code = (data?.code || '').toString().trim();
  if (!email || !code) throw new functions.https.HttpsError('invalid-argument', 'email and code required');

  const ref = db.collection('email_otps').doc(email);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError('failed-precondition', 'Invalid code');
  const row = snap.data();

  const now = admin.firestore.Timestamp.now();
  if (row.consumed) throw new functions.https.HttpsError('failed-precondition', 'Code already used');
  if ((row.attempts || 0) >= 5) throw new functions.https.HttpsError('resource-exhausted', 'Too many attempts');
  if (!row.expiresAt || row.expiresAt.toMillis() < now.toMillis()) throw new functions.https.HttpsError('deadline-exceeded', 'Code expired');

  if (row.code !== code) {
    await ref.update({ attempts: (row.attempts || 0) + 1 });
    throw new functions.https.HttpsError('failed-precondition', 'Invalid code');
  }

  await ref.update({ consumed: true });
  return { verified: true };
});
