// The DataPair Exclusive Data Brokerage Agreement: the single source of truth for
// the signing page (served by /api/agreement) and for the signed PDF (built by /api/sign).
// Changing any wording? Bump VERSION so every signature records exactly what was signed.
import crypto from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_PNG_BASE64 } from './logo.js';

export const VERSION = '2026-11-12b';
export const TITLE = 'Exclusive Data Brokerage Agreement';
export const INTRO = 'Between the Client named below and DataPair LLC, a Florida limited liability company (“DataPair”). Effective on the date the Client signs.';
export const DATAPAIR_SIGNER = { name: 'Ari Walfish', title: 'Authorized Member', email: 'ari@datapair.ai', company: 'DataPair LLC' };

export const SUMMARY = [
  'DataPair represents you: we submit your data to vetted AI buyers, handle all the back-and-forth, and bring you the best offers.',
  'Nothing up front. You pay 10% only when a DataPair buyer pays you. One-time payment: 10% of that payment. Recurring payments: 10% of each one for 24 months.',
  'Exclusive for 6 months, but you can leave after 60 days if we haven’t brought you a quote.',
  'You choose the offer and sign the final deal yourself. We share your details only with vetted buyers, under confidentiality, and never with buyers you tell us to skip. We never receive personal information.',
];

export const SECTIONS = [
  ['1. What DataPair Does', [
    'DataPair will act as the Client’s authorized representative for licensing the data described in the Client’s DataPair intake (the “Data”). DataPair will present the Data and the Client’s intake information to AI developers, research labs and other data buyers, submit applications, receive quotes and negotiate on the Client’s behalf, and bring the Client the best offers it receives. DataPair cannot promise that any quote or deal will happen, or at what price.',
  ]],
  ['2. Exclusivity and Term', [
    'For 6 months from the date the Client signs, DataPair is the Client’s only broker for the Data. During that time the Client will not list the Data with another broker or marketplace, or pitch it to buyers itself. Afterward, this agreement continues month to month until either side ends it by email with 15 days’ notice.',
    'If DataPair has not brought the Client at least one genuine quote within 60 days after receiving the Client’s completed intake, the Client may end this agreement by email on 7 days’ notice. A genuine quote is a written price or price range for the Data from a named prospective buyer, even if nonbinding or subject to due diligence.',
    'Buyers the Client was already talking to before signing, and names to DataPair by email before signing, are excluded: the Client may deal with them directly and owes no fee. If a company that is not a Buyer contacts the Client on its own about the Data during the exclusive period, the Client will forward that company’s first message to DataPair within 3 business days, and the fee on any resulting deal is 5%.',
  ]],
  ['3. Representation, Buyers and Deals', [
    'The Client authorizes DataPair, during this agreement, to represent the Client to buyers: to submit applications and the Client’s intake information, act as the Client’s main contact, receive quotes and negotiate terms. DataPair may share the Client’s name, contact details and intake information, without further approval, with Mercor, Handshake AI, Scale AI, micro1, SourceX and other established AI data buyers and AI labs, and only under confidentiality terms. The Client may exclude any buyer by email at any time, and DataPair will not contact excluded buyers. DataPair will keep the Client informed of the buyers it has contacted. DataPair may not sign or accept any binding agreement for the Client.',
    'A “Buyer” is a company that DataPair has submitted the Client to, presented the Data to, brought a quote from, or introduced the Client to, and has named to the Client in writing (email is fine). A Buyer includes its affiliates, subsidiaries and any entity it uses to make the purchase. Each Buyer stays covered during this agreement and for 12 months after it ends. Every deal is the Client’s decision and is signed directly between the Client and the Buyer. DataPair is not a party to those deals and is not responsible for their terms.',
  ]],
  ['4. Fees', [
    'The Client will pay DataPair 10% of what the Client or its affiliates actually receive under any deal for the Data signed with a Buyer during this agreement or within 12 months after it ends, including license fees, installments, renewals, extensions, additional data purchases and data refreshes, less refunds and taxes. A one-time payment is charged once. For recurring or later payments, the fee applies to each payment received within 24 months from the Client’s first payment from that Buyer, even after this agreement ends, and then stops. The fee is earned only when the Client is paid. There are no upfront, hourly or monthly charges, and each side covers its own costs.',
    'Buyers may also pay DataPair referral fees or bonuses. These are paid by the Buyer, are separate from and in addition to the Client’s fee, and do not reduce what the Client receives.',
  ]],
  ['5. Payment and Records', [
    'Where the Buyer agrees, the Buyer will pay DataPair’s share directly to DataPair. Otherwise, the Client will pay it within 10 days after receiving each payment. The Client will send DataPair a copy of each signed Buyer deal within 5 business days and share payment records on request; unrelated details may be blacked out, as long as amounts, dates and payer stay visible. The Client will not structure or reroute a Buyer deal to avoid the fee, and if it does, the fee still applies. Late amounts accrue interest at 1.5% per month, or the legal maximum if lower.',
  ]],
  ['6. Data and Confidentiality', [
    'The Client owns its data and keeps owning it. DataPair does not receive the Client’s raw data or records; data moves directly between the Client and the Buyer under their own agreement. The Client will not send DataPair personal information about any individual, and any samples must be aggregated or de-identified. The Client confirms it has the legal right to license the Data, and is responsible for making sure that doing so complies with privacy and other laws and with its own contracts, confidentiality obligations and privacy policies.',
    'Each side will keep the other’s non-public business information confidential during this agreement and for 3 years after it ends, and DataPair will delete Client information on request. DataPair is a broker and does not give legal, tax or privacy advice.',
  ]],
  ['7. Responsibility', [
    'Each side is responsible for third-party claims caused by its own breach: the Client for its rights to the Data, and DataPair for confidentiality. Apart from fees owed, confidentiality breaches and those claims, neither side is liable for indirect or consequential damages, and each side’s total liability is limited to the greater of the fees paid to DataPair in the prior 12 months or $5,000.',
  ]],
  ['8. General', [
    'Florida law governs this agreement, and any dispute will be heard in the state or federal courts in Miami-Dade County, Florida. The prevailing side may recover reasonable attorneys’ fees. The Buyer coverage in Section 3 and Sections 4 through 7 continue after this agreement ends. This is the entire agreement, and changes must be in writing signed by both sides. If any part is unenforceable, the rest still applies. Electronic signatures count as originals.',
  ]],
];

export const CONSENT_TEXT = 'I have read this agreement and the Letter of Authorization, I agree to both on behalf of the company named above, I am authorized to sign for that company, and I agree that typing my name below is my electronic signature.';

// One-page Letter of Authorization, signed together with the agreement and shown to buyers.
export const LOA_TITLE = 'Letter of Authorization';
export const LOA_BODY = [
  '{company} (the “Company”) authorizes DataPair LLC and its representative, Ari Walfish, to act as the Company’s authorized representative in discussions about licensing the Company’s business data.',
  'This includes submitting applications and information about the Company and its data, serving as the Company’s main point of contact, receiving quotes, and negotiating terms on the Company’s behalf.',
  'DataPair may not sign binding agreements for the Company. Any final agreement will be reviewed and signed by the Company directly.',
  'Please direct all correspondence about this matter to DataPair at ari@datapair.ai. This authorization is effective from the date below and remains in effect until the Company withdraws it in writing.',
];

// Fingerprint of the exact wording, recorded with every signature.
export function agreementHash() {
  const canonical = JSON.stringify({ VERSION, TITLE, INTRO, SUMMARY, SECTIONS, CONSENT_TEXT, LOA_BODY });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function publicAgreement() {
  return { version: VERSION, title: TITLE, intro: INTRO, summary: SUMMARY, sections: SECTIONS,
    consent: CONSENT_TEXT, datapair: DATAPAIR_SIGNER, hash: agreementHash(), loa: { title: LOA_TITLE, body: LOA_BODY } };
}

// ---------- PDF ----------
const NAVY = rgb(7 / 255, 24 / 255, 57 / 255);
const INK = rgb(27 / 255, 35 / 255, 51 / 255);
const GREY = rgb(91 / 255, 101 / 255, 118 / 255);
const GREEN = rgb(22 / 255, 185 / 255, 138 / 255);
const BLUE = rgb(31 / 255, 79 / 255, 216 / 255);
const LIGHT = rgb(242 / 255, 246 / 255, 252 / 255);
const RULE = rgb(154 / 255, 165 / 255, 184 / 255);

// Standard PDF fonts only cover WinAnsi; swap anything else for a safe character.
const clean = s => String(s ?? '').replace(/[^\x20-\x7E -ÿ–—‘’“”•…€]/g, '?');

function wrap(text, font, size, width) {
  const words = clean(text).split(/\s+/); const lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(t, size) <= width) line = t;
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildSignedPdf(sig) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`DataPair ${TITLE} - ${clean(sig.company)}`);
  pdf.setAuthor('DataPair LLC');
  const F = await pdf.embedFont(StandardFonts.Helvetica);
  const B = await pdf.embedFont(StandardFonts.HelveticaBold);
  const I = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));

  const W = 612, H = 792, M = 45, CW = W - 2 * M;
  let page, y;
  const pages = [];
  const newPage = () => {
    page = pdf.addPage([W, H]); pages.push(page);
    const top = H - 36;
    page.drawImage(logo, { x: M, y: top - 20, width: 26, height: 20.3 });
    page.drawText('DataPair', { x: M + 32, y: top - 15, size: 15, font: B, color: NAVY });
    const r1 = 'DataPair LLC', r2 = 'www.datapair.ai';
    page.drawText(r1, { x: W - M - F.widthOfTextAtSize(r1, 7.6), y: top - 8, size: 7.6, font: F, color: GREY });
    page.drawText(r2, { x: W - M - F.widthOfTextAtSize(r2, 7.6), y: top - 18, size: 7.6, font: F, color: GREY });
    page.drawLine({ start: { x: M, y: top - 27 }, end: { x: W - M, y: top - 27 }, thickness: 1.4, color: GREEN });
    y = top - 46;
  };
  const ensure = h => { if (y - h < 50) newPage(); };
  const para = (text, { font = F, size = 8.9, lead = 11.4, color = INK, indent = 0, after = 3.5 } = {}) => {
    const lines = wrap(text, font, size, CW - indent);
    ensure(lines.length * lead);
    for (const l of lines) { page.drawText(l, { x: M + indent, y: y - size, size, font, color }); y -= lead; }
    y -= after;
  };

  newPage();
  para(TITLE, { font: B, size: 15, lead: 18, color: NAVY, after: 2 });
  para(INTRO, { size: 7.6, lead: 9.5, color: GREY, after: 8 });

  // At a glance box
  const bl = SUMMARY.map(s => wrap(s, F, 8.9, CW - 32));
  const boxH = 22 + bl.reduce((n, l) => n + l.length * 11.4 + 2, 0) + 6;
  page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: LIGHT });
  page.drawRectangle({ x: M, y: y - boxH, width: 2.5, height: boxH, color: BLUE });
  page.drawText('At a glance', { x: M + 12, y: y - 15, size: 8.9, font: B, color: NAVY });
  let by = y - 22;
  for (const lines of bl) {
    page.drawText('•', { x: M + 14, y: by - 8.9, size: 8.9, font: F, color: INK });
    for (const l of lines) { page.drawText(l, { x: M + 24, y: by - 8.9, size: 8.9, font: F, color: INK }); by -= 11.4; }
    by -= 2;
  }
  y -= boxH + 8;

  for (const [title, paras] of SECTIONS) {
    ensure(20 + wrap(paras[0], F, 8.9, CW).length * 11.4); // keep the heading with its first paragraph
    y -= 3; para(title, { font: B, size: 9.6, lead: 12, color: NAVY, after: 1.5 });
    for (const p of paras) para(p);
  }

  // Signatures
  ensure(190);
  y -= 8; para('By signing below, both parties agree to this agreement.', { after: 8 });
  const colW = (CW - 30) / 2;
  const block = (x, heading, rows) => {
    let yy = y;
    page.drawText(heading, { x, y: yy - 9, size: 9, font: B, color: NAVY }); yy -= 14;
    for (const [label, value, isSig] of rows) {
      yy -= 13;
      if (value) page.drawText(clean(value), { x, y: yy, size: isSig ? 12 : 9.2, font: isSig ? I : F, color: isSig ? NAVY : INK });
      page.drawLine({ start: { x, y: yy - 3 }, end: { x: x + colW, y: yy - 3 }, thickness: 0.6, color: RULE });
      page.drawText(label, { x, y: yy - 12, size: 7.2, font: F, color: GREY });
      yy -= 14;
    }
    return yy;
  };
  const signedDate = new Date(sig.signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
  const y1 = block(M, 'CLIENT', [['Company legal name', sig.company], ['Signature', sig.name, true], ['Name', sig.name],
    ['Title', sig.title], ['Email', sig.email], ['Date', signedDate]]);
  const y2 = block(M + colW + 30, 'DATAPAIR', [['Company', DATAPAIR_SIGNER.company], ['Signature', DATAPAIR_SIGNER.name, true],
    ['Name', DATAPAIR_SIGNER.name], ['Title', DATAPAIR_SIGNER.title], ['Email', DATAPAIR_SIGNER.email]]);
  y = Math.min(y1, y2);

  // Signature certificate
  newPage();
  para('Electronic Signature Certificate', { font: B, size: 13, lead: 16, color: NAVY, after: 6 });
  para('This page records how the agreement above was signed electronically through datapair.ai.', { color: GREY, after: 10 });
  const rows = [
    ['Agreement', `${TITLE} (version ${VERSION})`],
    ['Signed by', `${sig.name}, ${sig.title}`],
    ['For company', sig.company],
    ['Signer email', sig.email],
    ['Signed at', new Date(sig.signedAt).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'long', timeStyle: 'long' }) + ` (${sig.signedAt} UTC)`],
    ['IP address', sig.ip || 'not available'],
    ['Browser', sig.userAgent || 'not available'],
    ['Signer confirmed', CONSENT_TEXT],
    ['DataPair signature', `${DATAPAIR_SIGNER.name}, ${DATAPAIR_SIGNER.title}, adopted electronically for DataPair LLC`],
    ['Agreement fingerprint (SHA-256)', sig.hash],
    ['Signature ID', sig.id],
  ];
  for (const [k, v] of rows) {
    const lines = wrap(v, F, 8.9, CW - 150);
    ensure(lines.length * 11.4 + 6);
    page.drawText(k, { x: M, y: y - 8.9, size: 8.9, font: B, color: NAVY });
    for (const l of lines) { page.drawText(l, { x: M + 150, y: y - 8.9, size: 8.9, font: F, color: INK }); y -= 11.4; }
    y -= 6;
  }

  const total = pages.length;
  pages.forEach((p, i) => {
    p.drawText(`DataPair ${TITLE}`, { x: M, y: 28, size: 7.2, font: F, color: GREY });
    const t = `Page ${i + 1} of ${total}`;
    p.drawText(t, { x: W - M - F.widthOfTextAtSize(t, 7.2), y: 28, size: 7.2, font: F, color: GREY });
  });
  return Buffer.from(await pdf.save());
}

export async function buildLoaPdf(sig) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${LOA_TITLE} - ${clean(sig.company)}`);
  pdf.setAuthor('DataPair LLC');
  const F = await pdf.embedFont(StandardFonts.Helvetica);
  const B = await pdf.embedFont(StandardFonts.HelveticaBold);
  const I = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));
  const W = 612, H = 792, M = 64, CW = W - 2 * M;
  const page = pdf.addPage([W, H]);
  const top = H - 44;
  page.drawImage(logo, { x: M, y: top - 20, width: 26, height: 20.3 });
  page.drawText('DataPair', { x: M + 32, y: top - 15, size: 15, font: B, color: NAVY });
  for (const [t, dy] of [['DataPair LLC', 8], ['www.datapair.ai', 18]])
    page.drawText(t, { x: W - M - F.widthOfTextAtSize(t, 7.6), y: top - dy, size: 7.6, font: F, color: GREY });
  page.drawLine({ start: { x: M, y: top - 27 }, end: { x: W - M, y: top - 27 }, thickness: 1.4, color: GREEN });

  let y = top - 70;
  const date = new Date(sig.signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
  page.drawText(LOA_TITLE, { x: M, y, size: 20, font: B, color: NAVY }); y -= 30;
  page.drawText(clean(date), { x: M, y, size: 10.5, font: F, color: GREY }); y -= 30;
  page.drawText('To whom it may concern:', { x: M, y, size: 11, font: F, color: INK }); y -= 24;
  for (const p of LOA_BODY) {
    for (const l of wrap(p.replace('{company}', sig.company), F, 11, CW)) { page.drawText(l, { x: M, y, size: 11, font: F, color: INK }); y -= 15.5; }
    y -= 10;
  }
  y -= 16;
  const row = (label, value, isSig) => {
    if (value) page.drawText(clean(value), { x: M, y, size: isSig ? 15 : 11, font: isSig ? I : F, color: isSig ? NAVY : INK });
    page.drawLine({ start: { x: M, y: y - 4 }, end: { x: M + 260, y: y - 4 }, thickness: 0.6, color: RULE });
    page.drawText(label, { x: M, y: y - 15, size: 8, font: F, color: GREY }); y -= 38;
  };
  page.drawText('For the Company', { x: M, y, size: 10, font: B, color: NAVY }); y -= 26;
  row('Signature', sig.name, true); row('Name and title', `${sig.name}, ${sig.title}`); row('Company', sig.company); row('Email', sig.email); row('Date', date);
  const foot = `Signed electronically through datapair.ai · Signature ID ${sig.id}`;
  page.drawText(clean(foot), { x: M, y: 40, size: 7.2, font: F, color: GREY });
  return Buffer.from(await pdf.save());
}
