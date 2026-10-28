# Validation record — 28 October 2026

## Latest configuration: ports.json, range 4100-4199

The user superseded the earlier 4800-4900 range with `ports.json`: Longo 4100,
Spring API 4101, Lightning 4102 and frontend 4103. The Node frontend proxies
same-origin `/api` requests to Spring while retaining cookies and CSRF headers.
The old `start-all.ps1` now delegates to the shared JSON-driven launcher.

After this change: Maven package passed; 5 configuration validation checks,
11 isolated API HTTP checks, 3 real Lightning account/CSRF proxy checks and
7 frontend HTTP checks passed. Frontend checks include account/recovery paths,
authenticated-API rejection and denial of `.env` and server-source access.
Node server syntax passed. The four services were started and checked on the
configured ports; no account or payment was created during these checks.

Earlier port assignments below are historical validation records.

## Reserved RehaConnect ports

Local defaults are now UI/API 4800, Lightning 4801, Longo 4802 and isolated HTTP
checks 4899. Maven packaging passed after the configuration change. All 11 HTTP
checks and all 3 real Lightning proxy checks passed on the new ports. Duplicate
ports and ports outside 4800-4900 were rejected before startup. The running
runtime's URLs, process IDs and port assignments are recorded in
`.cache/local-runtime.json`. Dedicated persisted account data was retained.

- RehaConnect: `mvn -o package`, using the existing local Maven cache: passed.
- JavaScript syntax: both frontend scripts passed `node --check`.
- English/German translation-key parity: passed for main and account/billing UI.
- `scripts/Test-RehaConnect.ps1`: all 11 HTTP checks passed, including blocked
  unauthenticated clinic access, missing-origin mutation rejection, unsigned
  webhook rejection and missing-upstream failure.
- `scripts/Test-LightningProxy.py`: three checks passed against the running
  Lightning service: CSRF generation, valid-CSRF credential validation and
  foreign-origin rejection. The proxy uses Java's JDK HTTP client to preserve
  Origin headers; no CSRF protection was disabled.
- Copied Lightning checkout: clean at
  `796e0bcadde1158cb9e307c0ca41a369c373fc1b`.
- Installed SDK 10.0.204 in `.cache/dotnet`, respecting Lightning's pinned SDK.
- Lightning Debug build: passed. ImageSharp reports that a Six Labors license is
  required for Release builds; production packaging was not attempted.
- Existing Lightning account, Stripe and real Java Longo tests: **39 passed,
  0 failed, 0 skipped**. The filter covers Stripe, PaidFulfillment,
  CustomerLifecycle, AccountFlow and LongoPersistence. Test data is isolated and
  is not application data or evidence of a real payment/email delivery.
- Lightning's Java Longo runtime compiled successfully with the installed JDK 21.

No production deployment, live payment, Maven Central publication, production
readiness certification or clinic-data compliance is claimed. Browser-level
visual testing and a configured Stripe test-mode purchase remain outstanding.

The dedicated local runtime was started using `scripts/Start-Local.ps1` with
separate data under `data/local`. The user-requested account was registered and
its existence and hashed-password storage were independently confirmed from the
real Longo state. Email verification remains false: Lightning returned
`verification_email_unavailable`. No verification, admin role or successful
login is fabricated. A configured email sender is still required.

The user's supplied Maven log independently shows compilation, signing and local
installation of Longo succeeded, followed by a Central upload HTTP 401 with a
placeholder token username. That log does not show successful publication.
