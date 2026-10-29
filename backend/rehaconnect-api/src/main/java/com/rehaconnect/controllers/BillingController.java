package com.rehaconnect.controllers;

import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.time.Duration;
import java.util.Set;
import java.util.concurrent.Semaphore;
import java.io.IOException;
import com.rehaconnect.clients.InternalAuthClient;

/** Transparent boundary to the copied Lightning account/Stripe implementation. */
@RestController
public class BillingController {
    private final String base,origin;
    private final boolean production;
    private final InternalAuthClient auth;
    private final RestTemplate http=transport(25),assistantHttp=transport(200);
    private final Semaphore assistantSlots=new Semaphore(4);
    private static RestTemplate transport(int timeout){
        var factory=new JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3)).followRedirects(java.net.http.HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(timeout));
        return new RestTemplate(factory);
    }
    private static final Set<String> ACTIONS=Set.of("csrf","login","register","logout","request-reset","request-verification","verify","reset","checkout","billing","retry-email");
    public BillingController(@Value("${lightning.internal-url:}") String base,
            @Value("${rehaconnect.public-url}") String origin,@Value("${rehaconnect.production:false}") boolean production,InternalAuthClient auth){
        this.base=base.replaceAll("/+$","");this.origin=origin.replaceAll("/+$","");this.production=production;this.auth=auth;
    }
    @RequestMapping(value={"/api/account","/api/account/{action}"},method={RequestMethod.GET,RequestMethod.POST})
    public ResponseEntity<byte[]> account(@PathVariable(required=false) String action,
            HttpServletRequest request,HttpServletResponse response){
        if(action!=null && !ACTIONS.contains(action))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        boolean post=request.getMethod().equals("POST");
        if(post && (!origin.equals(request.getHeader("Origin")) || request.getContentType()==null || !request.getContentType().split(";")[0].equalsIgnoreCase("application/json")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        byte[] body=post?readBody(request,16384):null;
        var result=forward("/api/account"+(action==null ? "" : "/"+action),HttpMethod.valueOf(request.getMethod()),body,request);
        if(post&&result.getStatusCode().is2xxSuccessful()&&Set.of("login","logout","reset","verify").contains(action))auth.invalidate();
        if(post && "logout".equals(action) && result.getStatusCode().is2xxSuccessful() && request.getSession(false)!=null)request.getSession(false).invalidate();
        return result;
    }
    @PostMapping("/api/billing/webhook")
    public ResponseEntity<byte[]> webhook(@RequestHeader(value="Stripe-Signature",required=false) String signature,
            HttpServletRequest request){
        if(signature==null || signature.isBlank())throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        byte[] body=readBody(request,1048576);
        return forward("/api/stripe/webhook",HttpMethod.POST,body,request);
    }
    /** Narrow assistant bridge; Lightning retains session and workspace CSRF authorization. */
    @RequestMapping(value={"/api/assistant","/api/assistant/{action}"},method={RequestMethod.GET,RequestMethod.POST})
    public ResponseEntity<byte[]> assistant(@PathVariable(required=false) String action,
            HttpServletRequest request){
        boolean post=request.getMethod().equals("POST");
        boolean metadata=action==null&&!post;
        if(!metadata && (!post || !Set.of("conversation","discover").contains(action==null?"":action)))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if(post && (!origin.equals(request.getHeader("Origin")) || request.getContentType()==null ||
                !request.getContentType().split(";")[0].equalsIgnoreCase("application/json")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(!assistantSlots.tryAcquire())throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Assistant capacity busy");
        try{
            // 64 KiB covers the UI's 6000 UTF-16 characters even after JSON escaping.
            byte[] body=post?readBody(request,65536):null;
            return forward("/api/workflow"+(metadata?"":"/"+action),post?HttpMethod.POST:HttpMethod.GET,body,request);
        }finally{assistantSlots.release();}
    }
    private static byte[] readBody(HttpServletRequest request,int limit){
        if(request.getContentLengthLong()>limit)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        try{
            byte[] body=request.getInputStream().readNBytes(limit+1);
            if(body.length>limit)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
            return body;
        }catch(IOException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Request body unavailable");}
    }
    private ResponseEntity<byte[]> forward(String path,HttpMethod method,byte[] body,HttpServletRequest request){
        if(base.isBlank())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Lightning not configured");
        var headers=new HttpHeaders();headers.setContentType(MediaType.APPLICATION_JSON);
        for(String name:new String[]{"Cookie","X-CSRF-Token","Stripe-Signature"})if(request.getHeader(name)!=null)headers.set(name,request.getHeader(name));
        // Lightning's development listener checks its own origin. Production checks the configured public origin.
        var uri=URI.create(base);
        headers.set("Origin",production ? origin : uri.getScheme()+"://"+uri.getAuthority());
        try {
            var result=(path.startsWith("/api/workflow")?assistantHttp:http).exchange(base+path,method,new HttpEntity<>(body,headers),byte[].class);
            var outgoing=new HttpHeaders();outgoing.setCacheControl("no-store");outgoing.setContentType(MediaType.APPLICATION_JSON);
            if(result.getHeaders().get(HttpHeaders.SET_COOKIE)!=null)outgoing.put(HttpHeaders.SET_COOKIE,result.getHeaders().get(HttpHeaders.SET_COOKIE));
            return new ResponseEntity<>(result.getBody(),outgoing,result.getStatusCode());
        }catch(HttpStatusCodeException e){return ResponseEntity.status(e.getStatusCode()).cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_JSON).body(e.getResponseBodyAsByteArray());}
        catch(RestClientException e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Lightning unavailable");}
    }
}
