# RehaConnect deployment preparation

This package deploys RehaConnect with its frontend embedded in the Spring Boot
JAR. It connects to an operator-configured Lightning service. It does not deploy,
replace, or change the existing Lightning production service or its customer data.

## Required integration before deployment

- Set an HTTPS `REHACONNECT_PUBLIC_URL` and configure its TLS edge using the
  provided Nginx location example. Expose only that edge publicly.
- Set `LIGHTNING_INTERNAL_URL` to the real private Lightning HTTP service, reachable
  on `LIGHTNING_DOCKER_NETWORK`. Do not expose Longo or model endpoints publicly.
- Lightning must accept exactly the RehaConnect public origin through its own
  `LSPP_PUBLIC_ORIGIN` configuration. Existing Lightning at scanprocessprint.com
  cannot be assumed to accept a different origin. Resolve this with the Lightning
  operator before routing real accounts or payments. Do not weaken origin or CSRF
  checks and do not repoint development at the production customer database.
- Enable Lightning workflow access only for intended verified accounts. Configure
  `LSPP_WORKFLOW_ENABLED`, `LSPP_WORKFLOW_ALLOWED_EMAILS`, and an absolute
  `LSPP_MODEL_ROUTES_FILE` in that service. Ensure .NET supports the language
  cultures used by the assistant (`DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false`
  where the installed runtime otherwise uses invariant globalization).
- Model routes in `config/model-routes.local.json` are local-development routes;
  container loopback is not the Windows host. Supply deployment-specific routes
  and discover the actual model identities before use. Gemma is not yet installed.
- Keep Lightning's existing mail and Stripe credentials on its own server. No
  provider credentials belong in this image or frontend.

## Prepare and start

1. From a reviewed checkout, run `mvn -f backend/rehaconnect-api/pom.xml package`.
   The resulting JAR contains the frontend; Node is not required in production.
2. Copy `.env.example` to `.env.production` in this directory, enter the actual
   integration values, and restrict access to the file.
3. From this directory run `docker compose --env-file .env.production config --quiet`,
   then `docker compose --env-file .env.production build`.
4. Back up the existing `clinic-data` volume before replacing an earlier release.
   Run only one RehaConnect instance against each data volume.
5. Start with `docker compose --env-file .env.production up -d` and inspect
   `docker compose --env-file .env.production ps` and application logs.
6. Verify public HTTPS, sign-in/out, email verification, workspace authorization,
   a real model response, clinic access isolation, and existing billing behavior.
   A health response alone does not verify these flows. Do not make a live payment
   as a deployment smoke test.

## Recovery

Record the previous image tag before updating. If application verification fails,
restore that image reference and recreate the application container. Preserve the
data volume; never run `docker compose down -v`. Restore a backup only through an
explicit data-recovery procedure. This release adds no storage-schema migration.

## Current boundaries

The persistent assistant and authenticated Lightning conversation bridge are
implemented. Browser dictation and speech playback depend on browser support,
permissions, installed voices and provider behavior. Real microphone/audio testing
is still required on target devices. Clinic PDF extraction, legal/clinical source
retrieval, Gemma routing, and the Kloud service connection remain integration work.
Do not advertise clinical/legal accuracy or those integrations as completed.

See `docs/DEPLOYMENT-VALIDATION-2026-10-29.md` for actual validation outcomes.
