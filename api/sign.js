// POST /api/sign — records an electronic signature of the agreement with an audit
// trail (time, IP, browser, exact wording), builds the signed PDF, stores it, and
// emails it to the client and to DataPair when Zoho is configured.
import crypto from 'node:crypto';
import { VERSION, agreementHash, buildSignedPdf, buildLoaPdf, TITLE } from '../lib/agreement.js';
import { redis, parse, readBody, clientIp, sendMail, notifyTo } from '../lib/store.js';
import { buildIntakePdf, intakeFilename } from '../lib/intake-pdf.js';

const s = (v, n = 200) => String(v ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  let b;
  try { b = readBody(req); } catch { return res.status(400).json({ error: 'The form data was unreadable.' }); }
  if (b.website) return res.status(200).json({ ok: true }); // honeypot

  const sig = { company: s(b.company), name: s(b.name), title: s(b.title), email: s(b.email), signature: s(b.signature) };
  const missing = Object.entries({ 'company legal name': sig.company, 'full name': sig.name, title: sig.title, email: sig.email })
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return res.status(400).json({ error: `Please fill in: ${missing.join(', ')}.` });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sig.email)) return res.status(400).json({ error: 'That email address looks incomplete.' });
  if (b.agree !== true) return res.status(400).json({ error: 'Please check the box to agree.' });
  const norm = x => x.toLowerCase().replace(/\s+/g, ' ').trim();
  if (norm(sig.signature) !== norm(sig.name)) return res.status(400).json({ error: 'Your typed signature must match your full name.' });
  if (b.version !== VERSION) return res.status(409).json({ error: 'The agreement was just updated. Please reload the page and review it again.' });

  // Link the signature to the intake, when the private link is valid
  let intake = null;
  if (b.id && b.t) {
    try {
      const e = parse(await redis.get(`datapair:intake:${s(b.id, 40)}`));
      if (e && e.token === b.t) intake = e;
    } catch (err) { console.error('redis', err); }
  }

  Object.assign(sig, {
    id: 'sig_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex'),
    intakeId: intake?.id || '',
    version: VERSION,
    hash: agreementHash(),
    signedAt: new Date().toISOString(),
    ip: clientIp(req),
    userAgent: s(req.headers['user-agent'], 300),
  });

  let pdf, loa;
  try { pdf = await buildSignedPdf(sig); loa = await buildLoaPdf(sig); }
  catch (e) { console.error('pdf', e); return res.status(500).json({ error: 'The signed copy could not be created. Please try again.' }); }
  const pdfB64 = pdf.toString('base64');

  try {
    await redis.set(`datapair:sig:${sig.id}`, JSON.stringify(sig));
    await redis.set(`datapair:pdf:${sig.id}`, pdfB64);
    await redis.set(`datapair:loa:${sig.id}`, loa.toString('base64'));
    await redis.lpush('datapair:signed', sig.id);
    if (intake) await redis.set(`datapair:sig-for:${intake.id}`, sig.id);
  } catch (e) {
    console.error('redis', e);
    return res.status(500).json({ error: 'Your signature could not be saved. Please try again.' });
  }

  const fname = `DataPair Agreement - ${sig.company.replace(/[^\w .,&-]/g, '')}.pdf`;
  const agreementFile = { filename: fname, content: pdf, contentType: 'application/pdf' };
  const loaName = `Letter of Authorization - ${sig.company.replace(/[^\w .,&-]/g, '')}.pdf`;
  const loaFile = { filename: loaName, content: loa, contentType: 'application/pdf' };

  // Client: their signed copy
  let emailed = false;
  try {
    emailed = await sendMail({
      to: sig.email,
      subject: `Your signed DataPair agreement`,
      text: `Hi ${sig.name.split(' ')[0]},\n\nThanks for signing the DataPair ${TITLE}. Your signed agreement and Letter of Authorization are attached for your records.\n\nFrom here we'll submit you to vetted buyers and handle the back-and-forth. We'll come back to you with the best offers.\n\nAri Walfish\nDataPair LLC\nwww.datapair.ai`,
      attachments: [agreementFile, loaFile],
    });
  } catch (e) { console.error('mail client', e); }

  // DataPair: the intake in clear form + the signed agreement, in one email
  try {
    const files = [];
    if (intake) {
      try { files.push({ filename: intakeFilename(intake), content: await buildIntakePdf(intake), contentType: 'application/pdf' }); }
      catch (e) { console.error('intake pdf', e); }
    }
    files.push(agreementFile, loaFile);
    await sendMail({
      to: notifyTo(), replyTo: sig.email,
      subject: `Signed: ${sig.company} — intake + agreement`,
      text: `${sig.name} (${sig.title}) signed the ${TITLE} for ${sig.company}.\n\n`
        + `Email: ${sig.email}\nSigned: ${sig.signedAt} UTC from IP ${sig.ip || 'n/a'}\n\n`
        + (intake ? 'Attached: 1) the intake, 2) the signed agreement, 3) the Letter of Authorization to attach to buyer applications.'
                  : 'Attached: the signed agreement and the Letter of Authorization. (Signed from the general link, so no intake is linked.)'),
      attachments: files,
    });
  } catch (e) { console.error('mail datapair', e); }

  return res.status(200).json({ ok: true, id: sig.id, emailed, filename: fname, pdf: pdfB64, loaFilename: loaName, loa: loa.toString('base64') });
}
