package com.rehaconnect.clients;

import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@Component
public class ComplianceClient {
    public boolean validateData(Map<String, Object> data) {
        // Never fabricate approval while the compliance contract is unverified.
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Compliance integration is not configured");
    }
}
