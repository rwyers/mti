# Ministry Training Institute — Standalone Portal

**GitHub:** https://github.com/rwyers/mti  
**Live site:** https://mti-portal.rwyers.workers.dev/  
**Admin:** https://mti-portal.rwyers.workers.dev/admin  
**Student page:** https://mti-portal.rwyers.workers.dev/student

Built independently of Webflow on Cloudflare Workers + D1.

## What works now

- Responsive public landing page based on MTI branding and learning pathways
- Password-protected administrator login with signed, HttpOnly sessions
- Private student directory with the ability to add student records
- Course catalog and editable lesson creation forms
- Assignment creation, assignment tracking, instructor feedback, and core /100 grading
- Separate additional-activities score, matching the source MTI marking format
- Cloudflare D1 database, with no real student roster committed to this public repository
- Starter course names and a Counseling Year 1 Lesson 3 curriculum example

## What is next

Individual student signup/sign-in, role-based teacher accounts, actual student submissions/files, the full existing curriculum import, printable PDF generator, grade history, email notifications, and backups. Student account registration is intentionally not open in this initial release.

**Security:** Never put student records, real assignments, passwords, or Cloudflare secrets into this public repository. Real private records live in D1; the admin APIs enforce a signed session. Administrator credentials are stored as secrets in Cloudflare rather than in code.

## Repository structure

- `public/index.html` — landing page
- `public/admin.html` — admin screens and interactions
- `public/student.html` — student page (coming soon)
- `src/worker.js` — Worker API with admin authentication and D1 CRUD
- `schema.sql` — database schema
- `scripts/build.mjs` — bundle public HTML into the Worker script
- `wrangler.jsonc` — Worker + D1 binding
- `package.json` — remote Cloudflare build commands

Deployment is already live from Cloudflare's API using this GitHub source. Cloudflare's Git auto-deploy integration has not yet been configured. When enabled, set build command to `npm run build` and deploy command to `npx wrangler deploy`. Everything runs in Cloudflare; a local development installation is not required.

## Source accuracy

MTI's original admin code, Excel curriculum workbooks, master template and private student database were used for planning but were **not copied into this public repository**. The current course list and sample lesson should be reviewed before any full curriculum import. The entire workbook data and student records remain to be imported through a private, permission-checked process.
