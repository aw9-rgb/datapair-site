// GET /api/submissions — returns all intake submissions. Requires the ADMIN_KEY
// environment variable, sent as the "x-admin-key" header.
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Wrong password.' });
  }
  const rows = await redis.lrange('datapair:intake', 0, -1);
  const items = rows.map(r => (typeof r === 'string' ? JSON.parse(r) : r));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ items });
}
