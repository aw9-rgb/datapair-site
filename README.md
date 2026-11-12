# datapair.ai site

- `public/index.html` — the site (single page)
- `public/admin.html` — view intake submissions at datapair.ai/admin.html
- `api/intake.js` — receives the form, saves to Upstash Redis, emails you if Zoho is set up
- `api/submissions.js` — feeds the admin page (password protected)

## Environment variables (Vercel → Project → Settings → Environment Variables)
- Upstash Redis (added automatically when you connect it from Vercel Marketplace → Storage)
- `ADMIN_KEY` — any password you choose, for the admin page
- Later, once Zoho mail works: `ZOHO_USER` (e.g. hello@datapair.ai), `ZOHO_PASS` (a Zoho app password), optional `NOTIFY_TO`
