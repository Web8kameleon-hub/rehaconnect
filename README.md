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
Secrets still come from process environment variables; `.env` is not loaded
automatically.

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
for configuration names. Spring does not automatically read `.env` files.
Configure a dedicated Lightning data directory and private Java Longo runtime,
using the source's existing deployment/runtime instructions. Lightning requires
.NET SDK 10.0.204 and its package/native dependencies. Registration requires a
working email provider; Stripe requires your configured product/price mapping
and keys. Never paste secrets into source code or browser configuration.

Local account navigation includes registration, verification, password recovery,
login/logout, current subscriptions and Stripe actions. Billing is account-level,
not yet a subscription per clinic. Payment return URLs do not prove payment.

Clinic creation/listing uses validated Lightning identities and copied Java Longo
storage, with server-enforced ownership. Additional staff and patient roles,
scheduling, meal publishing, announcements and document workflows remain open.
Portal switching is a preview control, not authorization.

## Checks

```powershell
node --check frontend/rehaconnect-ui/app.js
node --check frontend/rehaconnect-ui/integrations.js
powershell -ExecutionPolicy Bypass -File scripts/Test-RehaConnect.ps1
```

The HTTP checks start an isolated local process and verify static assets,
unauthenticated rejection, CSRF rejection, webhook signature-header requirements
and service-unavailable behavior. They do not create accounts or make payments.
See `docs/VALIDATION.md` for actual validation results and remaining limits.

