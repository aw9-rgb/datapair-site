// POST /api/intake — saves a seller intake submission to Upstash Redis,
// and emails a notification through Zoho if ZOHO_USER / ZOHO_PASS are set.
import { Redis } from '@upstash/redis';
import nodemailer from 'nodemailer';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const FIELDS = ['type', 'name', 'company', 'email', 'phone', 'industry', 'span',
  'description', 'personal', 'ownership', 'source', 'consent'];
const REQUIRED = ['name', 'company', 'email', 'industry', 'span', 'description',
  'personal', 'ownership', 'consent'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  // Honeypot: bots fill the hidden "website" field. Pretend success.
  if (body.website) return res.status(200).json({ ok: true });

  const entry = {};
  for (const k of FIELDS) entry[k] = String(body[k] ?? '').trim().slice(0, k === 'description' ? 5000 : 300);

  const missing = REQUIRED.filter(k => !entry[k]);
  if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}.` });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) return res.status(400).json({ error: 'That email address looks incomplete.' });

  entry.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  entry.createdAt = new Date().toISOString();
  entry.status = 'new';

  try {
    await redis.lpush('datapair:intake', JSON.stringify(entry));
  } catch (e) {
    console.error('redis', e);
    return res.status(500).json({ error: 'The form could not be saved.' });
  }

  // Optional email alert (works once the Zoho mailbox is live)
  if (process.env.ZOHO_USER && process.env.ZOHO_PASS) {
    try {
      const t = nodemailer.createTransport({
        host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
        port: 465, secure: true,
        auth: { user: process.env.ZOHO_USER, pass: process.env.ZOHO_PASS },
      });
      await t.sendMail({
        from: `"DataPair Intake" <${process.env.ZOHO_USER}>`,
        to: process.env.NOTIFY_TO || process.env.ZOHO_USER,
        replyTo: entry.email,
        subject: `New data intake: ${entry.company} (${entry.industry})`,
        text: FIELDS.filter(k => k !== 'type').map(k => `${k}: ${entry[k]}`).join('\n')
          + `\n\nReceived ${entry.createdAt}`,
      });
    } catch (e) { console.error('mail', e); /* submission is already saved */ }
  }

  return res.status(200).json({ ok: true });
}
