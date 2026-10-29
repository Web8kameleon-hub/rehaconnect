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
import java.util.HashMap;
import java.util.HexFormat;

/** Uses Lightning's existing cookie sessions; credentials are not handled here. */
@Component
public class InternalAuthClient {
    private final String base;
    private final RestTemplate http;
    private record Verified(Identity user,long expires){}
    private final Map<String,Verified> verified=new HashMap<>();
    public synchronized void invalidate(){verified.clear();}
    private synchronized Identity resolve(String cookie){
        String session=java.util.Arrays.stream(cookie.split(";")).map(String::trim)
                .filter(value->value.startsWith("LightningCustomer=")||value.startsWith("__Host-LightningCustomer="))
                .findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        String key;
        try{key=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(session.getBytes(StandardCharsets.UTF_8)));}
        catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
        long now=System.nanoTime();Verified cached=verified.get(key);
        if(cached!=null&&cached.expires()>now)return cached.user();
        HttpHeaders headers=new HttpHeaders();headers.set("Cookie",cookie);
        try {
            Map<?,?> result=http.exchange(base+"/api/account",HttpMethod.GET,new HttpEntity<>(headers),Map.class).getBody();
            if(result==null || !(result.get("userId") instanceof String id) || id.isBlank())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            Identity identity=new Identity(id,result.get("email") instanceof String email ? email : "");
            verified.entrySet().removeIf(entry->entry.getValue().expires()<=now);
            if(verified.size()>=1024)verified.clear();
            // Only actual upstream verification is cached; clinic permissions are checked on every request.
            verified.put(key,new Verified(identity,System.nanoTime()+Duration.ofSeconds(20).toNanos()));return identity;
        }catch(HttpClientErrorException e){verified.remove(key);throw new ResponseStatusException(e.getStatusCode().value()==429?HttpStatus.SERVICE_UNAVAILABLE:HttpStatus.UNAUTHORIZED);}
        catch(RestClientException e){verified.remove(key);throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);}
    }
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
        return resolve(cookie);
    }
    public String csrf(HttpServletRequest request) {
        var session=request.getSession(true);
        if(session.getAttribute("rehaCsrf")==null)session.setAttribute("rehaCsrf",UUID.randomUUID().toString()+UUID.randomUUID());
        return (String)session.getAttribute("rehaCsrf");
    }
    public record Identity(String id,String email) {}
}
