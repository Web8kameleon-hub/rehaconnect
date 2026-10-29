# Clinic workspace acceptance — 29 October 2026

## Implemented behavior

- Clinic profile editing and email-based admin/staff/patient membership.
- Patient directory, appointments, clinic-provided medication plans, events,
  meal plans, announcements, clinic information and rooms/resources.
- Create/edit/publish/archive forms, patient/status/date/search filters,
  stale-edit rejection and published-appointment overlap rejection.
- Patient-scoped views, event registration, self-reported intake logging,
  feedback, original PDF upload/download, calendar export and browser print/PDF.
- Dashboard counts derived from authorized saved records. The portal view follows
  the account's real clinic role; it does not grant permissions.
- Clinic records, role changes and audit updates persist together in Java Longo.
- Bounded caching of actual Lightning verification, with immediate cache clearing
  on app login/logout/verification/reset and live membership checks per request.
- An allowlisted `.env.local` loader for real SMTP/Resend/Stripe configuration.

## Checks performed

1. Maven package passed with **14 tests, 0 failures, 0 errors, 0 skipped**. Tests
   use isolated real Longo files and cover tenant isolation, authorization,
   membership persistence/revocation, patient visibility, exact PDF bytes,
   validation, archive/audit persistence, feedback/intakes, stale editors,
   schedule conflicts, profile editing and duplicate rooms.
2. **20 HTTP checks passed**, including unauthenticated access rejection for the
   new endpoints, CSRF/origin rejection and missing-provider failures.
3. **5 port-configuration checks passed**; local-secret allowlist parsing and
   rejection of unsupported settings passed.
4. JavaScript syntax and English/German translation-key parity passed for all
   application modules.
5. `Test-Workspace-E2E.py` passed with a real Chromium browser, real Lightning,
   real Spring API, real Java Longo and an in-process local SMTP mailbox.

The browser test performed signup, actual local SMTP delivery, email verification,
login, clinic creation, profile update, role assignment, all main record forms,
calendar download, exact PDF download, patient event registration, intake logging,
feedback, German UI, edit/archive filtering and logout. API access returned 401
immediately after logout. No browser JavaScript errors were reported.

The browser run used ports 4150-4154 and separate data under
`.cache/workspace-e2e/run-b44ca8463a9c` for the final accepted run. Screenshots,
logs and result metadata are local test artifacts, not production evidence.

## Limits of the evidence

Synthetic fixtures exist only in isolated tests; they are not installed as
patients, clinic records, subscriptions or metrics in the real application.
The user's account and live data were not changed by these tests. Local SMTP
delivery proves the implemented verification flow, not production-provider or
inbox delivery. Real Stripe keys/plans and a configured test-mode purchase remain
external requirements. No live charge, successful production delivery, clinical
certification or production deployment is claimed.

Browser reminders run only while the page is open and permission is granted.
Printing uses the browser's actual print/PDF function; background push and a
server PDF renderer are not claimed. TideWave is present in the reused source
but is not used to fabricate document-processing or IoT results.

External session revocation may take up to 20 seconds to reach the bounded
verification cache. Role revocations within the clinic take effect on the next
request. Local plaintext storage, single-instance clinic storage, backups,
retention and deployment security still require operational configuration before
real patient-data use.
