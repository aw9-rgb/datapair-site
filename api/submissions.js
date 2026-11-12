// GET /api/submissions — returns all intake submissions and signed agreements.
// GET /api/submissions?pdf=<signature id> — returns that signed PDF.
// Requires the ADMIN_KEY environment variable, sent as the "x-admin-key" header.
import { redis, parse } from '../lib/store.js';

export default async function handler(req, res) {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Wrong password.' });
  }
  res.setHeader('Cache-Control', 'no-store');

  if (req.query?.pdf) {
    const b64 = await redis.get(`datapair:pdf:${String(req.query.pdf).slice(0, 60)}`);
    if (!b64) return res.status(404).json({ error: 'Not found.' });
    res.setHeader('Content-Type', 'application/pdf');
    return res.status(200).send(Buffer.from(b64, 'base64'));
  }

  const rows = await redis.lrange('datapair:intake', 0, -1);
  const items = rows.map(parse).map(({ token, ...x }) => x); // never send signing tokens to the browser
  const sigIds = await redis.lrange('datapair:signed', 0, -1);
  const signatures = (await Promise.all(sigIds.map(id => redis.get(`datapair:sig:${id}`)))).filter(Boolean).map(parse);
  return res.status(200).json({ items, signatures });
}
