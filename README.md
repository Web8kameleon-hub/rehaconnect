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

Requires Java 17+ and Maven. In PowerShell:

```powershell
Set-Location C:\Users\pc\Rehaconnect\backend\rehaconnect-api
mvn package
$env:LIGHTNING_INTERNAL_URL='http://localhost:4801'
$env:REHACONNECT_PUBLIC_URL='http://127.0.0.1:4800'
java -jar target\rehaconnect-api-1.0.0.jar --server.port=4800
```

Open http://127.0.0.1:4800. Frontend sources are copied into the JAR during build.
The UI works without Lightning; account actions report unavailability until it runs.

After building Java and Lightning, `scripts/Start-Local.ps1` starts all three
local services with dedicated data under `data/local`. Use
`scripts/Stop-Local.ps1` to stop only the recorded processes. The required .NET
SDK is installed in `.cache/dotnet` on this workspace.

RehaConnect's reserved range is **4800-4900**. Fixed defaults: UI/API **4800**,
dedicated Lightning authentication/billing runtime **4801**, private Longo **4802**,
isolated HTTP-check process **4899**. The launcher rejects duplicate ports,
out-of-range ports and occupied ports. It never stops another application to
claim a port. Local service links and public origins are generated from the
selected ports; runtime addresses are recorded in `.cache/local-runtime.json`.

To select different fixed ports within the reserved range:

```powershell
.\scripts\Start-Local.ps1 -Port 4810 -LightningPort 4811 -LongoPort 4812
```

The Python proxy check uses 4800 by default; account registration accepts an
explicit origin as its first argument when using custom ports.

## Reused runtime

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

