package com.rehaconnect.clients;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import java.util.Map;

@Component
public class LongoClient {
    private final RestTemplate restTemplate = new RestTemplate();
    private final String baseUrl;

    public LongoClient(@Value("${longo.base-url}") String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public Map insertDocument(String database, String collection, Map<String, Object> doc) {
        String url = String.format("%s/v1/databases/%s/collections/%s/documents", baseUrl, database, collection);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(doc, headers);
        return restTemplate.postForObject(url, request, Map.class);
    }
}
