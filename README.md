## License

RehaConnect is a proprietary, commercial product. All rights reserved.

Unauthorized copying, distribution, modification, or use of this software is strictly prohibited without the express written permission of the copyright holder.

For licensing inquiries, contact **contact@clisonix.com**.

---
# RehaConnect

Responsive English/German clinic portal and patient view, with no seeded data or invented metrics.

The current scope includes billing. The supplied early PDF is historical background.
Lightning SPP supplies the reused authentication and Stripe implementation.

## Run the RehaConnect UI/API

Requires JDK 21+, Maven, .NET SDK 10.0.204 and Node.js. From PowerShell:

```powershell
Set-Location C:\Users\pc\Rehaconnect
mvn -f backend/rehaconnect-api/pom.xml package
.\.cache\dotnet\dotnet.exe build services/lightning-spp-3.14/source/wwwmmm.csproj
powershell -ExecutionPolicy Bypass -File .\start-all.ps1
```

The .NET SDK is installed under `.cache/dotnet` in this workspace. On another
computer with the required SDK installed globally, use `dotnet` instead.
Startup launches all four local services with dedicated data under `data/local`.
Use `scripts/Stop-Local.ps1` to stop only the recorded processes. The application
opens at http://127.0.0.1:4103; account actions use the actual Lightning service.

The single local port configuration is `ports.json`, with reserved range
**4100-4199**:

| Service | Port |
| --- | --- |
| Private Java Longo | 4100 |
| Spring Boot API | 4101 |
| Dedicated Lightning authentication/billing | 4102 |
| Browser frontend and same-origin API proxy | 4103 |
| Isolated HTTP-check process | 4199 |

After building, start all services from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-all.ps1
```

Open http://127.0.0.1:4103. Edit `ports.json` to change a port; keep each URL
consistent with its port. Startup validates the JSON and rejects duplicate,
out-of-range or occupied ports. It does not stop other applications.
Runtime addresses are recorded in `.cache/local-runtime.json`.
`start-all.ps1` delegates to the same launcher, avoiding nested PowerShell
commands and PATH quoting problems. Node.js is required for the frontend proxy;
no npm dependencies are needed. Account scripts read the same JSON configuration.

Spring entries such as `server.port=4101` are file settings, not PowerShell
commands. The launcher sets the required environment values from `ports.json`.
Secrets come from process environment variables or the optional, ignored `.env.local` file. Copy `config/secrets.example.env` to `.env.local` and enter your own mail/Stripe settings locally. The launcher reads an explicit allowlist without evaluating shell commands, printing values or changing system-wide settings.

## Reused runtime

Longo's independent repository is now
https://github.com/Web8kameleon-hub/LONGO-. It is no longer a RehaConnect submodule.
The local `infrastructure/longo` checkout is ignored to prevent accidentally
adding it as an embedded repository again. RehaConnect already includes the core
Java storage classes it uses; Lightning includes its own required Longo sources.
The application launcher does not require the independent checkout.

To retrieve that independent source separately, if needed:

```powershell
git clone https://github.com/Web8kameleon-hub/LONGO-.git infrastructure/longo
```

Lightning remains a submodule. After cloning RehaConnect, restore it with:

```powershell
git submodule update --init --recursive
```

The Lightning checkout is in `services/lightning-spp-3.14/source`, pinned to
`796e0bcadde1158cb9e307c0ca41a369c373fc1b`. Its original account, CSRF, Stripe
Checkout, billing portal, webhook and fulfillment code is used through a local
proxy. No production source or existing customer data has been changed.

See `docs/REUSE.md` for provenance, behavior and limitations, and `.env.example`
for configuration names. Spring does not automatically read `.env` files. The launcher reads only allowlisted secrets from `.env.local`.
Configure a dedicated Lightning data directory and private Java Longo runtime,
using the source's existing deployment/runtime instructions. Lightning requires
.NET SDK 10.0.204 and its package/native dependencies. Registration requires a
working email provider; Stripe requires your configured product/price mapping
and keys. Never paste secrets into source code or browser configuration.

Local account navigation includes registration, verification, password recovery,
login/logout, current subscriptions and Stripe actions. Billing is account-level,
not yet a subscription per clinic. Payment return URLs do not prove payment.

## Clinic workflows

Clinic administrators can create clinics and assign admin, staff or patient access
to verified account email addresses. Staff can manage patient directory entries,
appointments, clinic-provided medication information, events, announcements,
meal plans, general PDF documents, rooms/resources and clinic information. Entries support draft,
published and archived states. Concurrent stale edits and overlapping published
appointments for a patient, room or therapist are rejected.

Patients see their own appointments and clinic-provided medication plan, plus
published clinic or patient-specific content. They can join/leave events, record
an intake, send feedback, download authorized PDFs, export calendar entries and
print a medication plan to paper/PDF. Optional browser reminders run only while
the page is open and notifications are permitted; no background delivery is
promised. Displayed metrics are computed from actual saved records.

The portal view follows the selected clinic's real server-assigned role. It is
not an authorization control. Each data operation checks clinic membership and
record visibility on the server. Role changes take effect on the next request.
Only successful Lightning session verification is cached for at most 20 seconds
to avoid repeated upstream calls. App login/logout/password reset clear that
cache; session revocation performed directly outside RehaConnect can take up to
20 seconds to be reflected. Nothing is accepted as verified without an actual
upstream response. API responses are marked no-store.

Records, roles and their latest 2,000 audit events commit together in one Longo
clinic document. PDF uploads are limited to 5 MB and delivered as attachments;
file-signature checking is not a malware scan. The embedded clinic store supports
one application instance per data file. Production security, backup/restore,
retention policies and clinical-data approval remain deployment responsibilities.

## Email and Stripe activation

The complete local registration/verification/login flow is tested against real
Lightning and a local test SMTP mailbox. This does not prove delivery by your
production mail provider. The existing user account is not marked verified by
setup or tests. Configure your actual SMTP/Resend values, restart, and request a
new verification email from Account. Stripe similarly requires actual keys and
configured RehaConnect plans. No prices or successful payments are fabricated.

TideWave remains available in the reused Lightning source. No sensor feed or
Tide processing is claimed for uploaded documents; uploads preserve the original
PDF bytes.

## Checks

```powershell
node --check frontend/rehaconnect-ui/app.js
node --check frontend/rehaconnect-ui/integrations.js
node --check frontend/rehaconnect-ui/workspace.js
powershell -ExecutionPolicy Bypass -File scripts/Test-RehaConnect.ps1
```

The HTTP checks start an isolated local process and verify static assets,
unauthenticated rejection, CSRF rejection, webhook signature-header requirements
and service-unavailable behavior. They do not create accounts or make payments.
Backend tests use isolated real Longo storage. Run `mvn test` in the API project.
`scripts/Test-Workspace-E2E.py` runs real browser forms, Lightning, Java Longo and
an isolated SMTP mailbox on 4150-4154. It requires Python Playwright and its
Chromium browser, plus built application artifacts. Its synthetic users and
records stay under `.cache/workspace-e2e`, not in the real application's data.
No production account is changed and no external email or payment is sent.
See `docs/VALIDATION-2026-10-29.md` and `docs/WORKSPACE-API.md` for current acceptance results and API details. Earlier results remain in `docs/VALIDATION.md`.

