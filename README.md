# Ministry Training Institute — Standalone Website

Live public site: https://mti-portal.rwyers.workers.dev/  
Admin workspace: https://mti-portal.rwyers.workers.dev/admin  
Student portal: https://mti-portal.rwyers.workers.dev/student

All application code lives in the **rwyers/mti** GitHub repository. Hosting, data and private file storage run on the **rwyers** Cloudflare account, independently of Webflow. There is no local server or setup requirement.

## Current release

### Administrator portal
- Original shared-password login transitions into a named **primary owner** account on first sign-in. The user must immediately set a unique personal password.
- Staff directory: administrators can invite separate **administrator** or **teacher** accounts by private, expiring, one-use invitation links. Staff members choose their own passwords.
- Admin profile/password management, staff enabling/disabling, invitation reissue.
- Detailed audit history includes actor name/email, action, entity, timestamp and, when relevant, before/after changes.
- Student directory, student editing and invitations.
- Courses and lessons: create/edit lesson titles, scripture, assignments, notes and materials.
- Assignment creation, status changes and score tracking. The core rubric is marked out of **100**, with additional activities recorded separately.
- Graders can view submitted text and download private student files.

### Student portal
- Invitation-based account creation and student sign-in.
- Students can view their own assignments, year/lesson instructions, scripture and due dates.
- Written answer submissions, resubmission before grading, instructor score and feedback.
- Private R2 attachment uploads: PDF/DOCX/TXT/JPG/PNG; maximum 6 MB each, five per assignment.
- Print/save assignment sheets as PDF using browser print.
- Student password change and sign-out.

### Backend and security
- Cloudflare Worker `mti-portal`.
- Cloudflare D1 database `mti_portal`.
- Private Cloudflare R2 bucket `mti-student-submissions`.
- Server-validated signed sessions; only registered staff can access admin data, students only their own submissions.
- Passwords are PBKDF2-derived with per-user salts; credentials and session keys never stored in GitHub.
- Administrator and student accounts are in `user_accounts`; changes recorded in `audit_events`.
- No actual student roster has been imported. Only starter course names and a Counseling Year 1 Lesson 3 sample are in D1.

## Source files

- `public/index.html`: public landing page
- `public/admin.html`: administrator interface
- `src/admin-v2.js`: staff profiles, audit UI and edit screens (inlined at build time)
- `public/student.html`: actual student portal
- `src/worker.js`: all authenticated Worker APIs
- `schema.sql`: initial schema
- `migrations/0002_accounts_submissions_audit.sql`: named users, invitations, audit, submissions
- `migrations/0003_file_uploads.sql`: private assignment file metadata
- `scripts/build.mjs`: bundles source files in Cloudflare's remote build process
- `wrangler.jsonc`: Worker bindings for D1 and R2

## October 2026 curriculum and student import

- **334 populated lessons imported** from MTI's source package into Cloudflare D1; the previously created Counseling Year 1 Lesson 3 example remains, for **335 lessons total**.
- Published MTI course sheets supplied most lessons. Busy Man Working Women (27) and New Believers (1) came from the uploaded Excel workbooks after their published sources proved unavailable.
- Import is additive and idempotent, preserving already-edited lessons; admin-only course import controls are under **Curriculum import**.
- All **17 named rows from MTI Student Database.xlsx** were staged **privately** in Cloudflare for administrator review, but **zero students were automatically enrolled or invited**.
- The **Roster review** tab is private to owner/administrator accounts. Review, edit, approve or skip each staged record, with duplicate-email safeguards and an attributed audit history.
- Students do not receive signup invitations until an administrator intentionally invites them from the student directory.
- The temporary import-only URL has been removed from the deployed Worker.
- Current cloud infrastructure: Cloudflare Worker `mti-portal`, D1 `mti_portal`, private R2 `mti-student-submissions`.

### Student data safeguards

The original student workbook includes blank/incomplete enrollment rows, unverified addresses and duplicate/shared email addresses. Those rows must be resolved before approval. No private roster bytes were committed to this public GitHub repository. Do not put passwords, student rosters or private invitations in GitHub.

## Upcoming work

Import and verify the complete course workbooks and real student roster privately. Add automated emails, export/reporting, printable template refinements, backup and recovery, and full GitHub-to-Cloudflare continuous deployment.

Cloudflare's connection to the GitHub repo exists, but an independent build/deploy credential has **not** yet been set up. Current deployments were published directly through the Cloudflare API using GitHub source, without requiring local tooling.

## Operations

- Do not commit real student records, passwords, invite links, submissions or secrets to this public repository.
- A staff invitation link grants control of its intended account. Share it privately only.
- Account activity events are recorded from the new release onward. Older changes cannot be retroactively attributed to individual admins.
- Future migrations should be applied to production D1 before deploying code requiring the new tables.
