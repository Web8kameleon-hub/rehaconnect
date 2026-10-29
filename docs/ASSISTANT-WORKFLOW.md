# RehaConnect assistant and document workflow

User requirements recorded on 2026-10-29.

## Product behavior

- A persistent character opens chat on every application screen in both staff and patient views, including mobile layouts.
- Text input and text replies are always available. Voice input is explicitly activated by the user; spoken replies can be enabled or disabled. Missing microphone permissions or voice support must leave text usable.
- Lightning supplies the existing assistant and workflow foundation. Ollama serves configured LLaVA and Gemma models; available model identities and capabilities must be discovered before routing requests.
- Clinic PDFs enter a reviewable workflow: upload, page reading, extraction, organization, staff review, and publication into the existing clinic records.
- Every extracted item retains its source document and page. Ambiguous fields and conflicting appointments require review. Medication instructions are transcribed from source material rather than inferred or changed by a model.
- The assistant accesses only records authorized for the current account and clinic. Patient access remains limited to authorized patient content. Publishing or changing records requires existing server authorization and validation.
- Show actual pending, failed, unavailable, review-required, and completed states. Never report a successful model call, document extraction, record change, email, or payment without its real result.

## Existing implementation evidence

- `services/lightning-spp-3.14/source/Web/wwwroot/assistant.js`: existing floating character assistant and localization integration.
- `services/lightning-spp-3.14/source/Web/WorkflowApi.cs`: authenticated account workspaces, workflow tools, model chat, and explicit production access controls.
- `services/lightning-spp-3.14/source/Workflow/ModelGateway.cs`: configured Ollama routes, model discovery, chat, and image description for discovered vision-capable models. Routes use `LSPP_MODEL_ROUTES_FILE`.
- `services/lightning-spp-3.14/source/Services/Implementation/RealAIProcessor.cs`: CLX, CLX.i, and XCL currently implement Brotli compression variants. These operations do not establish semantic extraction or scheduling capabilities.
- RehaConnect currently stores original PDF attachments; it does not yet connect them to Lightning workflows or publish extracted records.

## Integration work remaining

1. Establish an authenticated HTTPS integration with the existing Lightning service, preserving its origin, session, CSRF, and workspace permission checks.
2. Discover the actual configured model routes and test image reading and text organization against representative anonymized clinic documents. Model names alone do not establish capability or accuracy.
3. Connect document jobs to clinic-scoped source records and persist reviewable extraction results with page provenance.
4. Map approved results into existing appointment and document APIs with duplicate and conflict checks.
5. The persistent RehaConnect assistant is now implemented in both views, with protective hands around a person, text input, optional browser dictation, speech playback and response-language selection. Device-level audio verification remains outstanding.
6. Verify isolation between clinics and patients, model-unavailable behavior, voice-denied behavior, extraction failures, and reviewed publication end to end.

The local authenticated conversation bridge has been verified with real Lightning,
an isolated verified test account and an actual Ollama response. This does not
establish a connection to the existing Lightning production instance, clinical
document extraction, legal-source retrieval or deployment. See the deployment
validation record for the exact checks and remaining limits.
