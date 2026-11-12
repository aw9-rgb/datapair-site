// Builds a clean, readable PDF of one intake submission (questions and answers),
// attached to the emails DataPair receives.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_PNG_BASE64 } from './logo.js';

const NAVY = rgb(7 / 255, 24 / 255, 57 / 255);
const INK = rgb(27 / 255, 35 / 255, 51 / 255);
const GREY = rgb(91 / 255, 101 / 255, 118 / 255);
const GREEN = rgb(22 / 255, 185 / 255, 138 / 255);
const LIGHT = rgb(242 / 255, 246 / 255, 252 / 255);
const RULE = rgb(211 / 255, 218 / 255, 230 / 255);

const clean = s => String(s ?? '').replace(/[^\x20-\x7E -ÿ–—‘’“”•…€]/g, '?');
function wrap(text, font, size, width) {
  const out = [];
  for (const para of clean(text).split(/\n/)) {
    const words = para.split(/\s+/); let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (font.widthOfTextAtSize(t, size) <= width) line = t;
      else { if (line) out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

export async function buildIntakePdf(entry) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`DataPair intake - ${clean(entry.company)}`);
  pdf.setAuthor('DataPair LLC');
  const F = await pdf.embedFont(StandardFonts.Helvetica);
  const B = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));
  const W = 612, H = 792, M = 45, CW = W - 2 * M, QW = 205;
  const pages = []; let page, y;

  const newPage = () => {
    page = pdf.addPage([W, H]); pages.push(page);
    const top = H - 36;
    page.drawImage(logo, { x: M, y: top - 20, width: 26, height: 20.3 });
    page.drawText('DataPair', { x: M + 32, y: top - 15, size: 15, font: B, color: NAVY });
    const r = 'Data review intake';
    page.drawText(r, { x: W - M - F.widthOfTextAtSize(r, 8), y: top - 12, size: 8, font: F, color: GREY });
    page.drawLine({ start: { x: M, y: top - 27 }, end: { x: W - M, y: top - 27 }, thickness: 1.4, color: GREEN });
    y = top - 46;
  };
  newPage();

  page.drawText(clean(entry.company || 'Intake'), { x: M, y: y - 16, size: 16, font: B, color: NAVY }); y -= 22;
  const when = new Date(entry.createdAt).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'long', timeStyle: 'short' });
  page.drawText(clean(`Submitted ${when} ET  ·  ${entry.industry || ''}${entry.employees ? '  ·  ' + entry.employees + ' employees' : ''}`),
    { x: M, y: y - 9, size: 9, font: F, color: GREY }); y -= 22;

  // Contact box
  const contact = [['Name', entry.name], ['Title', entry.title], ['Email', entry.email], ['Phone', entry.phone || '—']];
  const boxH = 16 + contact.length * 13;
  page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: LIGHT });
  let cy = y - 15;
  for (const [k, v] of contact) {
    page.drawText(k, { x: M + 12, y: cy, size: 9, font: B, color: NAVY });
    page.drawText(clean(v || '—'), { x: M + 70, y: cy, size: 9, font: F, color: INK }); cy -= 13;
  }
  y -= boxH + 16;

  const rows = Array.isArray(entry.summary) && entry.summary.length ? entry.summary
    : [['What data do you have?', entry.description], ['Years of records', entry.span], ['Personal information', entry.personal], ['Owns data', entry.ownership], ['Heard about us', entry.source]];
  for (const [q, a] of rows) {
    const ql = wrap(q, B, 8.6, QW - 10), al = wrap(a || '—', F, 8.9, CW - QW);
    const h = Math.max(ql.length * 11, al.length * 11.4) + 8;
    if (y - h < 50) newPage();
    ql.forEach((l, i) => page.drawText(l, { x: M, y: y - 9 - i * 11, size: 8.6, font: B, color: NAVY }));
    al.forEach((l, i) => page.drawText(l, { x: M + QW, y: y - 9 - i * 11.4, size: 8.9, font: F, color: INK }));
    y -= h;
    page.drawLine({ start: { x: M, y: y + 3 }, end: { x: W - M, y: y + 3 }, thickness: 0.5, color: RULE });
  }

  pages.forEach((p, i) => {
    const t = `Page ${i + 1} of ${pages.length}`;
    p.drawText(`Intake ID ${entry.id}`, { x: M, y: 28, size: 7.2, font: F, color: GREY });
    p.drawText(t, { x: W - M - F.widthOfTextAtSize(t, 7.2), y: 28, size: 7.2, font: F, color: GREY });
  });
  return Buffer.from(await pdf.save());
}

export const intakeFilename = e => `DataPair Intake - ${String(e.company || 'company').replace(/[^\w .,&-]/g, '')}.pdf`;
