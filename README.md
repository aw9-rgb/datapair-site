# datapair.ai site

- `index.html` — the home page
- `intake.html` — the click-through data review (intake)
- `sign.html` — review and e-sign the Exclusive Data Brokerage Agreement
- `admin.html` — view intakes and signed agreements at datapair.ai/admin.html
- `api/intake.js` — saves an intake, returns the client's private signing link, emails alerts
- `api/agreement.js` — serves the agreement text (and the client's details for a valid link)
- `api/sign.js` — records a signature with an audit trail, builds the signed PDF, emails it
- `api/submissions.js` — feeds the admin page (password protected), including signed PDFs
- `lib/agreement.js` — the agreement wording and PDF layout. Change wording here and bump `VERSION`.

## Environment variables (Vercel → Project → Settings → Environment Variables)
- Upstash Redis (added automatically when you connect it from Vercel Marketplace → Storage)
- `ADMIN_KEY` — any password you choose, for the admin page
- Once Zoho mail works: `ZOHO_USER` (e.g. hello@datapair.ai), `ZOHO_PASS` (a Zoho app password), optional `NOTIFY_TO`.
  Without these, nothing is emailed, but intakes and signed PDFs are still saved and shown in the admin page.
