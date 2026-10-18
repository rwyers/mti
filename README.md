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
- Full imported MTI lesson library is in D1. Historical student rows are staged for administrator review; enrollment is manual and private.

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

## Sequential nine-lesson curriculum enrollment (October 2026)

- Admin opens **Students → Enroll year**, selects the curriculum and year, and confirms nine available lessons. Incomplete years cannot be activated.
- Students see all **nine lesson cards** for their enrolled curriculum and year. Locked cards display only a lesson number and lock status — no Bible, assignment, reading or materials content is delivered by the private API for locked lessons.
- Lesson 1 is assigned upon enrollment (or an existing lesson assignment and grade are preserved).
- A student submits the current lesson. An instructor then grades it, automatically unlocking and assigning **the next lesson only**. Submitting without grading does not unlock anything.
- Direct requests to submission/file endpoints for locked lessons are rejected. Existing manually assigned classes remain unchanged until an administrator explicitly enrolls the student in a nine-lesson pathway.
- The admin receives a confirmation when grading unlocks a new lesson. A distinct actor is logged for each generated assignment.
- Database: `migrations/0006_student_learning_paths.sql`, protected API in `src/nine-lesson-pathway.js`, UI in `src/pathway-admin-ui.js` and `public/student.html`.

## Assignment email notifications

- Submission → an alert is queued for active MTI owner/administrator accounts.
- Assignment/enrollment/unlock, graded work and corrected grades → an alert is queued to the student's email.
- `notification_outbox` records every pending/sent/failed message and supports delivery retries. Admins can inspect these events under **Email notifications**.
- **Actual sending is not yet active**: connect and verify the GreatChurch.ca sending domain and grant MTI an authorized Cloudflare Email Service binding (or external provider API key). Do not claim messages were delivered while not configured. No secrets or student messages are committed to GitHub.
- Automated recurring retries and notification policy refinements remain follow-up work.

## Cross-curriculum session progress and paid-year approval

**Deployed October 2026.** An MTI academic year is a sequence of **nine sessions**, regardless of which of the school's complete curricula provides the assignments.

- Permanently credits each graded session to the student's record using `student_session_completions`, recording original course, source assignment, marks, and completion date. Original submissions, instructor feedback, and R2 attachments are not moved or deleted when a student switches curricula.
- Curriculum transfer example: Counseling Year 1 Sessions 1–7 completed → switch to Music and Creative Arts Year 1 → open Music Session 8, not Session 1. The nine-session student dashboard displays previous completions as graded, with the name of the original course.
- On instructor grading of the current session, the next session is opened. When all nine are graded, Year N changes to **completed** and becomes a collapsible history card in the student portal.
- Year N+1 **never opens automatically**. Only owner/admin accounts can enroll a paid new year, and the previous year must have completed all nine sessions. The admin confirmation records who approved payment; it does not process payment or verify banking transactions.
- Admin **Students → Enroll year** now displays student history and progress, supports curriculum transfers without erasing completed work, and requires payment confirmation for the next year.
- Admin **Courses & lessons** now uses searchable category cards → course dropdowns → year dropdowns → individual session editing. Original courses and 335 lessons remain in D1.
- New D1 tables: `student_year_enrollments`, `student_session_completions`, and `student_curriculum_transfers`. See `migrations/0007_cross_curriculum_progress.sql`.
- The transfer, automatic unlocking at Session 8/9, Year 1 completion/archival and a separate paid Year 2 enrollment were successfully tested on Cloudflare. Temporary test data and diagnostic routes were removed.

### MTI sending domain

- Intended sender: `notifications@greatchurch.ca` (stored as `MTI_EMAIL_FROM` in Cloudflare secrets).
- Cloudflare-native sending is supported by the Worker via an optional `EMAIL` send binding, with Resend as an alternative service. The MTI outbox retains events and delivery statuses.
- **Not sending yet:** `greatchurch.ca` belongs to a different Cloudflare account (GlobalConnectionsChurch), which has not been exposed to the currently connected rwyers Cloudflare tool. The domain must be verified for Email Sending, and an approved sender binding or API credential needs to be configured. No email is marked delivered before provider acceptance.
- Real recipient notification emails are still pending until the sender account has been connected and tested.

## Safe backup and OpenAI editing release — October 18, 2026

Before this release, MTI's GitHub source was snapshotted on branch `backup/pre-ai-tools-2026-10-18`, and all 17 application D1 tables (schema plus rows) were exported into private Cloudflare R2 bucket `mti-private-backups` under `2026-10-18/pre-ai-tools/`. The private backup manifest identifies the snapshot; Cloudflare's internal `_cf_KV` table is managed by D1 and is excluded. A D1 Time Travel bookmark was also recorded. Never commit backup data or student records to GitHub.

- **Student portal:** assignment instructions and submission panel are collapsed by default, so the student can see the dashboard without scrolling through the entire lesson. Selecting a lesson opens the panel. Existing assignment submission and print controls are unchanged.
- **Student materials:** **Find these materials online** offers Amazon.ca product-search links and search links for official author/publisher sites. Results are suggestions only; students can buy or borrow from any provider. Listings and availability are not guaranteed.
- **Admin AI lesson assistant:** inside **Edit lesson**, staff can proofread the full written lesson or type/paste/speak an instruction such as changing a memory-verse reference. A per-field proposed edit is shown next to the original, with individual checkboxes. AI never updates D1 automatically; changes first populate the editor, then the administrator must press **Save lesson**.
- **OpenAI:** the MTI Worker uses the existing `MTI_OPENAI_KEY` Cloudflare secret server-side. A live test returned valid JSON; the diagnostic endpoint was removed afterward. Browser speech recognition is optional and depends on client support. No OpenAI key is exposed to students or staff.
- **Application files:** `src/ai-edit-materials.js`, `src/ai-editor-ui.js`, and `public/student.html`. `scripts/build.mjs` includes them in the remote Cloudflare build.

## Correcting an accidental assignment

Under **Admin overview → Recent assignments** or **Assignments → All assignments**, an owner/administrator can choose **Unassign** for a lesson that is still assigned and has no student submission, uploaded files, grade or completion credit. The admin previews the effects and explicitly confirms.

- Removing a standalone mistaken assignment (e.g. Music) deletes only that assigned lesson; the student's existing Counseling pathway is unaffected.
- If it is also the only untouched lesson of their current curriculum/year, the workflow explains that the mistaken active year enrollment will be removed so the assignment does not immediately reappear. If there are completed sessions or other assignments in that curriculum/year, removal is blocked with an explanation; use **Enroll year** to transfer curricula safely.
- Submitted or graded work remains protected, including uploads and year completion. An attributed `unassign_assignment` event is written to the audit history.
- A cancelled/unsent assignment notice in the outbox is removed with the assignment. All real enrollments and grades remain unchanged until an administrator explicitly confirms unassignment.
- Protected Worker API: `GET /api/admin/assignments/:id/unassign-review` and `POST /api/admin/assignments/:id/unassign`; source `src/unassign-assignments.js`. Admin delegated click handler: `src/unassign-ui.js`.

## Student assignment cards and permanent submitted-work history

- On **Admin overview → Recent assignments** and **Assignments → View all**, work is grouped under collapsible student cards instead of a long per-assignment table. Students with the most assignments awaiting marking appear first, highlighted; cards with pending marking are open by default. Each card contains all assigned, submitted and graded work, with Review / Mark now and eligible Unassign buttons. The View all screen includes a student/assignment search. The Grading page also lists submitted work first.
- On a curriculum transfer (e.g. six completed Counseling sessions, then Pastoral Session 7), completed scores and original course names remain attached to the student's year. Submissions still awaiting marking also remain visible in **Submitted work from previous curricula**, with their original response and file links. Historical submissions are read-only after a transfer.
- For correctness, an administrator must grade any pending submitted work in the same academic year **before** transferring curricula, ensuring sessions receive credit before the new course's next session opens.
- The live student and admin screens have been tested with representative samples. Temporary test students and temporary test API endpoints were removed.
- Implementation: `src/student-assignment-cards-ui.js`, `src/year-progress.js`, `public/student.html`, `scripts/build.mjs`.

## Upcoming work

Complete private roster review and account onboarding; connect a verified sender and test automatic delivery, finish reports, printable template refinements, backup and recovery, and full GitHub-to-Cloudflare continuous deployment.

Cloudflare's connection to the GitHub repo exists, but an independent build/deploy credential has **not** yet been set up. Current deployments were published directly through the Cloudflare API using GitHub source, without requiring local tooling.

## Operations

- Do not commit real student records, passwords, invite links, submissions or secrets to this public repository.
- A staff invitation link grants control of its intended account. Share it privately only.
- Account activity events are recorded from the new release onward. Older changes cannot be retroactively attributed to individual admins.
- Future migrations should be applied to production D1 before deploying code requiring the new tables.
