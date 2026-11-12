// GET /api/agreement?id=…&t=… — the current agreement text for the signing page,
// plus the client's details from their intake when the private link is valid.
import { publicAgreement } from '../lib/agreement.js';
import { redis, parse } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET.' });
  const out = publicAgreement();
  const { id, t } = req.query || {};
  if (id && t) {
    try {
      const e = parse(await redis.get(`datapair:intake:${String(id).slice(0, 40)}`));
      if (e && e.token === t) {
        out.prefill = { company: e.company, name: e.name, title: e.title || e.answers?.title || '', email: e.email };
        const signed = await redis.get(`datapair:sig-for:${e.id}`);
        if (signed) out.alreadySigned = true;
      }
    } catch (err) { console.error('redis', err); }
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(out);
}
