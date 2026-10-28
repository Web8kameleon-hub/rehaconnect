package com.rehaconnect.clients;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;
import java.time.Duration;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

/** Uses Lightning's existing cookie sessions; credentials are not handled here. */
@Component
public class InternalAuthClient {
    private final String base;
    private final RestTemplate http;
    public InternalAuthClient(@Value("${lightning.internal-url:}") String base) {
        this.base=base.replaceAll("/+$", "");
        this.http=new RestTemplateBuilder().setConnectTimeout(Duration.ofSeconds(3)).setReadTimeout(Duration.ofSeconds(8)).build();
    }
    public Identity require(String unused) {
        var attributes=(ServletRequestAttributes)RequestContextHolder.currentRequestAttributes();
        HttpServletRequest request=attributes.getRequest();
        String cookie=request.getHeader("Cookie");
        if(cookie==null || cookie.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if(base.isBlank())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        if(!request.getMethod().equals("GET")) {
            var session=request.getSession(false);
            String expected=session==null ? null : (String)session.getAttribute("rehaCsrf");
            String supplied=request.getHeader("X-Reha-CSRF");
            if(expected==null || supplied==null || !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),supplied.getBytes(StandardCharsets.UTF_8)))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        HttpHeaders headers=new HttpHeaders();headers.set("Cookie",cookie);
        try {
            Map<?,?> result=http.exchange(base+"/api/account",HttpMethod.GET,new HttpEntity<>(headers),Map.class).getBody();
            if(result==null || !(result.get("userId") instanceof String id) || id.isBlank())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            return new Identity(id,result.get("email") instanceof String email ? email : "");
        }catch(HttpClientErrorException e){throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);}
        catch(RestClientException e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);}
    }
    public String csrf(HttpServletRequest request) {
        var session=request.getSession(true);
        if(session.getAttribute("rehaCsrf")==null)session.setAttribute("rehaCsrf",UUID.randomUUID().toString()+UUID.randomUUID());
        return (String)session.getAttribute("rehaCsrf");
    }
    public record Identity(String id,String email) {}
}
