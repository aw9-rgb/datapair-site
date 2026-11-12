// Shared Upstash Redis client and Zoho mailer for the API routes.
import { Redis } from '@upstash/redis';
import nodemailer from 'nodemailer';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const parse = v => (typeof v === 'string' ? JSON.parse(v) : v);

export function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
}

export function clientIp(req) {
  const f = req.headers['x-forwarded-for'];
  return (Array.isArray(f) ? f[0] : (f || '')).split(',')[0].trim() || req.headers['x-real-ip'] || '';
}

// Sends mail through Zoho when ZOHO_USER / ZOHO_PASS are set; otherwise does nothing.
export async function sendMail(opts) {
  if (!process.env.ZOHO_USER || !process.env.ZOHO_PASS) return false;
  const t = nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com', port: 465, secure: true,
    auth: { user: process.env.ZOHO_USER, pass: process.env.ZOHO_PASS },
  });
  await t.sendMail({ from: `"DataPair" <${process.env.ZOHO_USER}>`, ...opts });
  return true;
}
export const notifyTo = () => process.env.NOTIFY_TO || process.env.ZOHO_USER;
