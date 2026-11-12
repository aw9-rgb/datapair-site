// Save-and-finish-later for the intake.
// POST /api/draft  { email, answers, pos, id?, t? }  saves progress and emails a resume link.
// GET  /api/draft?id=…&t=…                           returns the saved progress for that link.
import crypto from 'node:crypto';
import { redis, parse, readBody, sendMail } from '../lib/store.js';

const TTL = 60 * 60 * 24 * 30; // drafts are kept for 30 days

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const { id, t } = req.query || {};
    if (!id || !t) return res.status(400).json({ error: 'Missing link details.' });
    const d = parse(await redis.get(`datapair:draft:${String(id).slice(0, 40)}`));
    if (!d || d.token !== t) return res.status(404).json({ error: 'This link has expired or is invalid.' });
    return res.status(200).json({ answers: d.answers || {}, pos: d.pos || 0 });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Use GET or POST.' });
  let b;
  try { b = readBody(req); } catch { return res.status(400).json({ error: 'The form data was unreadable.' }); }

  const email = String(b.email || '').trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  let answers = {};
  try { const raw = JSON.stringify(b.answers || {}); if (raw.length <= 40000) answers = JSON.parse(raw); } catch {}

  // Re-saving from a resume link keeps the same link
  let id = String(b.id || '').slice(0, 40), token = String(b.t || '');
  if (id && token) {
    const old = parse(await redis.get(`datapair:draft:${id}`));
    if (!old || old.token !== token) { id = ''; token = ''; }
  }
  if (!id) { id = 'd' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'); token = crypto.randomBytes(16).toString('hex'); }

  const draft = { id, token, email, answers, pos: Number(b.pos) || 0, savedAt: new Date().toISOString() };
  try { await redis.set(`datapair:draft:${id}`, JSON.stringify(draft), { ex: TTL }); }
  catch (e) { console.error('redis', e); return res.status(500).json({ error: 'Your progress could not be saved.' }); }

  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'datapair.ai'}`;
  const link = `${origin}/intake.html?resume=${id}&t=${token}`;
  let emailed = false;
  try {
    emailed = await sendMail({
      to: email,
      subject: 'Finish your DataPair data review',
      text: `Your answers are saved. Pick up right where you left off:\n\n${link}\n\nThe link works on any device for the next 30 days.\n\nDataPair\nwww.datapair.ai`,
    });
  } catch (e) { console.error('mail', e); }

  return res.status(200).json({ ok: true, emailed, id, t: token, link });
}
