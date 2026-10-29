# Clinic workspace API

All routes below require an actual verified Lightning cookie session. Mutations
also require `X-Reha-CSRF` from `GET /api/auth/me`. Account routes retain
Lightning's separate `X-CSRF-Token` mechanism. Use the frontend origin from
`ports.json`; its proxy preserves cookies and authorization headers.

| Route | Behavior |
| --- | --- |
| `GET /api/clinics` | Clinics owned by or assigned to the verified account, including its role |
| `POST /api/clinics` | Create a clinic owned by the verified account |
| `PUT /api/clinics/{clinic}` | Admin updates clinic name/address/timezone with current `version` |
| `GET /api/clinics/{clinic}/overview` | Authorized records for all modules in one response |
| `GET /api/clinics/{clinic}/records/{type}` | Authorized records for one module |
| `POST /api/clinics/{clinic}/records/{type}` | Admin/staff create a record |
| `PUT /api/clinics/{clinic}/records/{type}/{id}` | Admin/staff update; requires current `version` from `updated_at` |
| `DELETE /api/clinics/{clinic}/records/{type}/{id}` | Admin/staff archive a record |
| `GET /api/clinics/{clinic}/documents/{id}/download` | Authorized original PDF attachment |
| `GET /api/clinics/{clinic}/members` | Admin membership list |
| `POST /api/clinics/{clinic}/members` | Admin assign/remove role by verified-account email |
| `GET /api/clinics/{clinic}/audit` | Admin change history |
| `POST /api/clinics/{clinic}/records/events/{id}/register` | Patient joins a visible event |
| `POST /api/clinics/{clinic}/records/events/{id}/unregister` | Patient leaves an event |
| `POST /api/clinics/{clinic}/records/medications/{id}/taken` | Patient logs own intake at actual server time |
| `GET /api/clinics/{clinic}/feedback` | Staff sees clinic feedback; patients see their own |
| `POST /api/clinics/{clinic}/feedback` | Save feedback from the authenticated account |

Record types: `patients`, `appointments`, `medications`, `events`, `documents`,
`messages`, `meals`, `information`, `rooms`. Each record includes `title`, optional `body`,
`status` (`draft`, `published`, `archived`) and optional `patient_id`. Additional
fields match the real forms in `workspace.js`.

Appointment/event timestamps use ISO-8601 UTC instants. Forms convert the browser's
local time to UTC and display saved times in the clinic's configured time zone.
Meals use ISO local dates. Medication reminder times are local clinic times.

Patients are linked to their verified account by normalized email. They cannot
read other patient records or edit clinic content. Appointments and medication
records require a valid patient in the same clinic. General published content is
visible to assigned patients; patient-specific content requires the matching
patient. Unrelated clinic IDs return 404. Role changes apply on each request.

PDF uploads use `filename` and `content_base64` in the documents form request.
The server checks the PDF signature and 5 MB size limit, stores original bytes,
and omits attachment data from record-list responses. Download authorization is
checked again server-side. No document processing or medical extraction is
simulated.

Validation errors return 400; unauthenticated access 401; role/CSRF denial 403;
missing/inaccessible records 404; stale edits, duplicate active patient emails or
appointment overlap 409; unavailable auth/storage 503. No success response is
generated when storage fails. Records and audit updates commit together.

Identity verification may be reused for up to 20 seconds after an actual
Lightning response, keyed by a SHA-256 fingerprint of the signed session cookie.
This is bounded in-memory verification caching, not a separate login mechanism.
Membership is always checked against current persisted clinic data. Login,
logout, verification and password reset through this app clear the cache.

The local embedded store is single-instance, with the latest 2,000 audit events
per clinic. These limits and plaintext local disk storage must be considered
before any deployment with patient data; the application does not assert a
security/compliance certification.
