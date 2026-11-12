// POST /api/intake — saves a seller intake submission to Upstash Redis, emails an
// alert through Zoho if configured, and returns a private link for signing the agreement.
// Accepts the click-through intake (type "seller-v2") and the original short form.
import crypto from 'node:crypto';
import { redis, readBody, sendMail, notifyTo } from '../lib/store.js';
import { buildIntakePdf, intakeFilename } from '../lib/intake-pdf.js';

const FIELDS = ['type', 'name', 'company', 'email', 'phone', 'industry', 'span', 'employees',
  'description', 'personal', 'ownership', 'source', 'consent', 'title'];
const REQUIRED_V1 = ['name', 'company', 'email', 'industry', 'span', 'description', 'personal', 'ownership', 'consent'];
const REQUIRED_V2 = ['name', 'company', 'email', 'industry', 'consent'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  let body;
  try { body = readBody(req); } catch { return res.status(400).json({ error: 'The form data was unreadable.' }); }

  // Honeypot: bots fill the hidden "website" field. Pretend success.
  if (body.website) return res.status(200).json({ ok: true });

  const entry = {};
  for (const k of FIELDS) entry[k] = String(body[k] ?? '').trim().slice(0, k === 'description' ? 5000 : 300);

  const isV2 = entry.type === 'seller-v2';
  const missing = (isV2 ? REQUIRED_V2 : REQUIRED_V1).filter(k => !entry[k]);
  if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}.` });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) return res.status(400).json({ error: 'That email address looks incomplete.' });

  if (isV2) {
    entry.summary = (Array.isArray(body.summary) ? body.summary : [])
      .slice(0, 120)
      .filter(r => Array.isArray(r) && r.length === 2)
      .map(([q, a]) => [String(q).slice(0, 200), String(a ?? '').slice(0, 2000)]);
    try {
      const raw = JSON.stringify(body.answers || {});
      entry.answers = raw.length <= 40000 ? JSON.parse(raw) : { note: 'answers too large to store' };
    } catch { entry.answers = {}; }
  }

  entry.id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  entry.token = crypto.randomBytes(16).toString('hex'); // private key for the signing link
  entry.createdAt = new Date().toISOString();
  entry.status = 'new';

  try {
    await redis.lpush('datapair:intake', JSON.stringify(entry));
    await redis.set(`datapair:intake:${entry.id}`, JSON.stringify(entry));
  } catch (e) {
    console.error('redis', e);
    return res.status(500).json({ error: 'The form could not be saved.' });
  }

  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'datapair.ai'}`;
  const signUrl = `${origin}/sign.html?id=${entry.id}&t=${entry.token}`;

  try {
    const lines = isV2
      ? [`Name: ${entry.name}`, `Email: ${entry.email}`, `Phone: ${entry.phone || '—'}`, '',
         ...entry.summary.map(([q, a]) => `${q}\n  ${a}`)]
      : FIELDS.filter(k => k !== 'type').map(k => `${k}: ${entry[k]}`);
    let intakePdf = null;
    try { intakePdf = await buildIntakePdf(entry); } catch (e) { console.error('intake pdf', e); }
    await sendMail({
      to: notifyTo(), replyTo: entry.email,
      subject: `New data intake: ${entry.company} (${entry.industry}${entry.employees ? ', ' + entry.employees + ' full-time employees' : ''})`,
      text: `The full intake is attached as a PDF. You'll get a second email with the signed agreement when they sign.\n\n`
        + lines.join('\n') + `\n\nReceived ${entry.createdAt}\nTheir signing link: ${signUrl}`,
      attachments: intakePdf ? [{ filename: intakeFilename(entry), content: intakePdf, contentType: 'application/pdf' }] : [],
    });
    if (isV2) await sendMail({
      to: entry.email,
      subject: 'We received your DataPair data review',
      text: `Hi ${entry.name.split(' ')[0]},\n\nThanks for telling us about ${entry.company}'s data. We'll review your answers and reply within two business days.\n\nIf you haven't yet, you can review and sign our agreement here:\n${signUrl}\n\nDataPair\nwww.datapair.ai`,
    });
  } catch (e) { console.error('mail', e); /* submission is already saved */ }

  return res.status(200).json({ ok: true, id: entry.id, token: entry.token });
}
