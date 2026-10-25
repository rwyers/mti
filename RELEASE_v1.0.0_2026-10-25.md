# MTI v1.0.0 — Stable snapshot
**Release date:** October 25, 2026  
**Live site:** https://mti.greatchurch.ca  
**Snapshot:** This release branch was created from commit `232ac7d608c9a968532553aa2f3f7b8ba8f6ee42`.  
**Cloudflare Worker version:** `b0ef9261-01a2-48ae-b78e-757cdd5d3dda` (100% traffic when snapshotted)

## Included features
- Admin and student MTI portal, curriculum library and year/lesson organization
- Red "Needs updating" and blue "Current" review markers, searchable lesson library
- Full-screen Admin lesson editor with standardized per-material assignment cards, AI/voice editing, and print controls
- Three-sheet assignment printing: one card-based lesson and grading page, two handwriting activity pages, duotang-friendly left margin
- Automatically generated printed Date Started (nearest Sunday) and Date Due (six Sundays later)
- Student assignment and activity forms, including Next Steps, and Admin grading with private saved partial marks and slide-to-finish confirmation
- 100-point core marking rubric with optional bonus categories and printable office-use marking area
- Email notifications remain **OFF** as at snapshot

## Private recovery backups
The **production database and student records are not committed to this public repository**. A separate private backup exists under Cloudflare R2 bucket `mti-private-backups`:
`2026-10-25/mti-v1.0.0/`

Private backup folder contains a full portable SQL database dump (20 user tables, 605 rows, including 335 lessons), individual JSON table backups, the compiled production Worker source, settings without secret values, a restore guide, and a checksummed manifest.

Database SQL SHA-256:
`1f97af6ed883ecbe00fd195118f48bbdcc12a55c1f1ec11abf44e9a5cd089b56`

**Recovery limitations:** The single PDF upload in the production `mti-student-submissions` bucket is referenced in the backup manifest but is not independently copied. Preserve that original R2 bucket. Cloudflare Worker secret *values* are intentionally not exported.

## Restoring
Restore the code from this branch/recorded commit or redeploy the recorded Worker version. **Never overwrite a live D1 database without first testing the private SQL backup in a separate empty database.** See private `RESTORE-INSTRUCTIONS.txt` for full details.

This is a named stable source snapshot branch, not a GitHub Releases-page artifact. The production site and current main branch were not changed to create it.
