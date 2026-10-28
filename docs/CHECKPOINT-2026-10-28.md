# Work checkpoint — 28 October 2026

This checkpoint saves the RehaConnect work and current dependency versions. It
is a development snapshot, not a production release or deployment.

## Saved application work

- Responsive clinic and patient views in English and German, with empty or
  unavailable states instead of fabricated records or metrics.
- Spring Boot API serving the frontend and clinic ownership enforced on the
  server, using copied Java Longo storage classes.
- Integration with Lightning's existing cookie authentication, CSRF, account
  recovery, Stripe Checkout, billing portal and webhook processing.
- Fixed local ports in the reserved 4800-4900 range: UI/API 4800, Lightning 4801,
  Longo 4802 and isolated HTTP checks 4899. Startup validates port assignments.
- Start/stop, account registration and HTTP verification scripts, plus reuse and
  validation documentation.

## Dependency recovery

Both external source trees are Git submodules with published upstream commits:

- `infrastructure/longo`: `656c67869aa1a26141f01eca6a231f6472642236` in
  `Web8kameleon-hub/clisonix-evolution`. Includes the user's Longo Maven file and
  `LightningAuthFilter.java`. That filter is not wired into RehaConnect's runtime.
- `services/lightning-spp-3.14/source`:
  `796e0bcadde1158cb9e307c0ca41a369c373fc1b` in
  `Web8kameleon-hub/Lightning-SPP-3.14`.

To recover the source on another computer:

```powershell
git clone --recurse-submodules https://github.com/Web8kameleon-hub/rehaconnect.git
Set-Location rehaconnect
```

For an existing checkout:

```powershell
git pull --ff-only
git submodule update --init --recursive
```

Builds require the Java and .NET SDKs described in README.md. SDK caches and build
outputs are not part of the Git backup.

## Local-only state

Passwords, `.env`, account/session databases, local data, logs and runtime process
IDs are excluded from Git. This source backup does not back up live account or
clinic data. The local account remains pending email verification because email
delivery is not configured. No admin role or successful verification is implied.

## Verification and remaining work

The latest application build, 11 isolated HTTP checks, 3 Lightning proxy checks,
and port-range/duplicate-port rejection checks passed. The earlier Lightning
Debug build and 39 selected upstream tests passed; see `VALIDATION.md` for scope
and limitations. No new production behavior is claimed by this checkpoint.

Email-provider configuration, clinic membership/roles and the unfinished clinical
organization modules remain open. Stripe configuration and an actual test-mode
purchase have not been verified. No live payment or deployment was performed.
