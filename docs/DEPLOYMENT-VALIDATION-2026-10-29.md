# Deployment validation — 29 October 2026

## Implemented

- Persistent protective-hands assistant in staff and patient views, responsive on
  desktop/mobile, with text chat, optional browser dictation and speech playback.
- Response-language selector: Albanian, German, English, French, Italian, Spanish,
  Portuguese, Dutch, Polish, Turkish, Arabic and Ukrainian. This is a language
  preference, not evidence of model accuracy in each language.
- Narrow authenticated bridge to Lightning workflow metadata, conversation and
  model discovery. No execution, payment or arbitrary workflow routes are exposed
  by this new bridge. Lightning retains session and CSRF checks.
- Local Ollama routes for installed Llama 3.1 8B and LLaVA 7B. Gemma remains
  uninstalled. .NET language cultures enabled by the local launcher.
- Monotonic edit timestamps prevent two rapid saves from accepting a stale editor.
- Docker/Compose templates, TLS-edge example, recovery instructions, and a ZIP
  packaging script with an explicit file allowlist and SHA256 checksums.

## Completed checks

- Java: 15 tests passed, including bridge header/cookie forwarding, upstream error
  propagation, rejected origins, oversized requests and disallowed action routes.
- Maven JAR packaging passed. The final frontend assets are embedded in the JAR.
- JavaScript syntax checks passed for the assistant, integration and proxy files.
- Isolated HTTP suite: 25 checks passed, including assistant assets and rejection
  of unauthorized/disallowed requests.
- Real browser end-to-end suite passed with dedicated test data, real Java Longo,
  Lightning and a local SMTP test mailbox. A verified synthetic account received
  a real response from the installed local Ollama model through the assistant.
  Clinic creation, record forms, publication filtering, patient actions, exact PDF
  download, German UI and immediate logout revocation also passed.
- Browser UI checks passed for desktop/mobile, both portal views, language changes,
  signed-out behavior, Escape/focus handling and absence of JavaScript errors.
- Docker Compose configuration validated with a temporary credential-free template.
- Docker Engine 28.3.0: image `rehaconnect:validation-20261029` built successfully.
  A temporary Linux container passed HTTP checks for the application and assistant
  assets, unauthenticated clinic rejection and unavailable-upstream behavior.
  The container ran as UID/GID 10001 with a read-only root filesystem and isolated
  writable tmpfs data; its image healthcheck command passed. The test container
  was removed afterwards. No production deployment was performed.

## Required before production acceptance

- Verify an operator-approved HTTPS integration with the actual Lightning runtime,
  including exact origin configuration, verified accounts, mail delivery and
  intended workspace access. Existing scanprocessprint.com health alone does not
  prove these flows. No live payment was initiated during these checks.
- Verify target-browser microphone permissions, dictation and actual audible
  playback. Automated UI checks do not establish working physical audio.
- Clinic-document extraction, clinical/legal source retrieval, Gemma and Kloud
  service integration remain unfinished. No clinical or legal validation is claimed.
- Review deployment-specific model routes, source licenses, backup/restore and
  jurisdictional requirements before using real clinical data.

Local development accounts and clinic data were preserved. Synthetic users and
SMTP messages remained under `.cache/workspace-e2e`; no external email was sent.
