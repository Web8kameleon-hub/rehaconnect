# Architecture

The Java API embeds the frontend for deployment. Dedicated Longo clinic storage
enforces clinic membership and patient visibility. Lightning supplies account
sessions, CSRF, existing billing and workflow conversations. Ollama serves actual
operator-configured local models.

The assistant remains visible in staff and patient views, with text, optional
dictation, speech playback and response-language selection. It does not yet read
clinic records or authoritative legal/clinical sources.

See [inspected capabilities and remaining work](https://github.com/Web8kameleon-hub/rehaconnect/blob/main/docs/ASSISTANT-WORKFLOW.md).
