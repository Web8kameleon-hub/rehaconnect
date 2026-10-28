# Reused systems and current scope

The user's current scope supersedes `RehaConnect_Scope (1).pdf`. Billing is in
scope. The PDF is historical background; no no-billing restriction is applied.
English/German and no fabricated application data remain requirements.

## Lightning is the account and billing authority

Source: https://github.com/Web8kameleon-hub/Lightning-SPP-3.14

Copied checkout: `services/lightning-spp-3.14/source`

Pinned source commit: `796e0bcadde1158cb9e307c0ca41a369c373fc1b`.
The checkout retains upstream history and its license. It has not been deployed,
pushed or modified. Use a dedicated runtime and data directory for RehaConnect;
do not point development at the production Lightning customer database.

RehaConnect forwards account requests to the existing `Web/CustomerAccounts.cs`:
registration, verification, password recovery, login, logout, Checkout and billing
portal. Cookie flags and Lightning CSRF tokens are retained. POSTs must originate
from the configured RehaConnect origin. Clinic mutations additionally require an
independent server-session CSRF token and a currently valid Lightning identity.
No password implementation or bearer-token fallback is substituted.

Stripe webhooks are forwarded byte-for-byte, with their signature, to Lightning's
existing `/api/stripe/webhook`. `StripeBilling.cs`, `StripeGateway.cs` and
`PaidFulfillment.cs` remain responsible for signature verification, canonical
provider reads, plan matching and durable reconciliation. Browser return URLs do
not mark an account paid. No live Checkout or payment is initiated by setup/tests.

Plans, subscriptions and payment handling currently belong to the Lightning
account. Clinic-specific subscriptions and additional clinic members/roles are
not implemented. Do not interpret account entitlements as clinic access control.

## Java Longo

The backend embeds the existing Java engine from the local
`infrastructure/longo/java-longo/src/main/java/com/clisonix/longo` source tree.
Copied classes remain in their original namespace under the backend source tree.
Only core storage/collection/filter classes are copied; no public Longo server
is exposed by Spring. Clinic ownership is assigned from the validated account,
never from the request body, and clinic listing is filtered server-side.

Lightning also contains its own Java Longo runtime under `Persistence/Longo`,
including compare-and-swap for account/payment persistence. These are separate
storage paths: embedded clinic records and Lightning account aggregates.
Run only one RehaConnect instance against its embedded clinic storage file.

## Tide

The copied Lightning repository includes TideWave scan modes and implementations
in `Services/Implementation/FastScanService.cs`. The older Clisonix local tree
also contains a cadence engine and a draft signed-sync specification. They are
different components. No IoT readings, sync guarantees or document-processing
results are invented. TideWave has not yet been connected to a RehaConnect upload
flow; its source is available in the copied Lightning checkout.

## Open work

- Connect and verify dedicated runtime configuration and email delivery.
- Verify real-user registration/login and Stripe test-mode purchase with the
  user's configured RehaConnect plans; no credentials or prices are assumed.
- Add clinic staff/patient roles, membership invitations and audit events.
- Complete scheduling, meal plans, announcements, documents and medication display.
- Verify privacy, operations and deployment before patient-data use.
