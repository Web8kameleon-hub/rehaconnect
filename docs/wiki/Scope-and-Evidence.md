# Scope and evidence

Reference: owner-supplied `RehaConnect_Scope_v2_0_Repository-Abgleich.pdf`, dated
29 October 2026. Its five pages compare a README excerpt with the proposed scope;
the document explicitly states that it did not independently inspect source code
or linked test reports. It is reference material, not a production approval or an
instruction to override the owner's decisions in the project conversation.

## Current decisions

- Account-level billing remains in scope, as explicitly requested by the owner.
  Clinic-specific billing remains unimplemented.
- The intended document workflow is clinic PDF reading, organization, review and
  publication. The current implementation stores original PDFs; semantic
  extraction and reviewed publication from PDF contents remain integration work.
- The persistent assistant, text interaction, response-language preference and
  optional browser voice controls extend the README snapshot reviewed in the PDF.
  Gemma, Kloud and authoritative legal/clinical retrieval remain unfinished.
- No diagnostic, prescribing or medication-dose decision engine is established.

## Evidence and limits

| Area | Evidence available | Remaining limit |
| --- | --- | --- |
| Build and API | Java tests, HTTP authorization checks and GitHub CI | Passing exercised cases is not complete security certification |
| Assistant | Real isolated Lightning/Ollama browser flow; separate synthetic UI regression fixtures | Physical audio and multilingual answer accuracy are not established |
| Clinic workflows | Synthetic patient/staff forms, publication checks and original PDF download | Comprehensive jurisdictional and real-clinic acceptance remain outstanding |
| Container | Non-root, read-only filesystem and HTTP smoke tests | Target Hetzner authentication and production-origin integration are not verified |
| Email and billing | Local SMTP test mailbox; reused Lightning billing code | Real provider delivery and a complete Stripe test/live acceptance flow are not proved by CI |
| Operations | Deployment/backup/rollback code and configuration are prepared | Target-host execution and restore acceptance have not been completed |

The PDF's still-open operating, rights, role-matrix and pilot questions remain
open unless supported by a separate recorded decision or acceptance result.

See [recorded validation](https://github.com/Web8kameleon-hub/rehaconnect/blob/main/docs/DEPLOYMENT-VALIDATION-2026-10-29.md)
and [actual workflow runs](https://github.com/Web8kameleon-hub/rehaconnect/actions/workflows/ci-cd.yml).
