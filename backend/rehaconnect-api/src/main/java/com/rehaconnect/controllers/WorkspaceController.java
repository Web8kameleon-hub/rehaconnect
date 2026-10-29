package com.rehaconnect.controllers;

import com.rehaconnect.WorkspaceService;
import com.rehaconnect.clients.InternalAuthClient;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/clinics/{clinic}")
public class WorkspaceController {
    private final WorkspaceService service;
    private final InternalAuthClient auth;
    public WorkspaceController(WorkspaceService service,InternalAuthClient auth){this.service=service;this.auth=auth;}
    @GetMapping("/overview") public Map<String,Object> overview(@PathVariable String clinic){return service.overview(clinic,auth.require(null));}
    @GetMapping("/records/{type}") public List<Map<String,Object>> list(@PathVariable String clinic,@PathVariable String type){return service.list(clinic,type,auth.require(null));}
    @PostMapping("/records/{type}") public Map<String,Object> create(@PathVariable String clinic,@PathVariable String type,@RequestBody Map<String,Object> body)throws IOException{return service.save(clinic,type,null,body,auth.require(null));}
    @PutMapping("/records/{type}/{id}") public Map<String,Object> update(@PathVariable String clinic,@PathVariable String type,@PathVariable String id,@RequestBody Map<String,Object> body)throws IOException{return service.save(clinic,type,id,body,auth.require(null));}
    @DeleteMapping("/records/{type}/{id}") public void archive(@PathVariable String clinic,@PathVariable String type,@PathVariable String id)throws IOException{service.archive(clinic,type,id,auth.require(null));}
    @PostMapping("/records/{type}/{id}/{action}") public Map<String,Object> action(@PathVariable String clinic,@PathVariable String type,@PathVariable String id,@PathVariable String action)throws IOException{return service.action(clinic,type,id,action,auth.require(null));}
    @GetMapping("/members") public List<Map<String,Object>> members(@PathVariable String clinic){return service.members(clinic,auth.require(null));}
    public record Membership(String email,String role){}
    @PostMapping("/members") public void member(@PathVariable String clinic,@RequestBody Membership body)throws IOException{service.member(clinic,body.email(),body.role(),auth.require(null));}
    @GetMapping("/audit") public List<Map<String,Object>> audit(@PathVariable String clinic){return service.audit(clinic,auth.require(null));}
    public record Feedback(String body){}
    @GetMapping("/feedback") public List<Map<String,Object>> feedback(@PathVariable String clinic){return service.feedback(clinic,auth.require(null));}
    @PostMapping("/feedback") public void feedback(@PathVariable String clinic,@RequestBody Feedback body)throws IOException{service.feedback(clinic,body.body(),auth.require(null));}
    @GetMapping("/documents/{id}/download") public ResponseEntity<byte[]> download(@PathVariable String clinic,@PathVariable String id){
        var file=service.download(clinic,id,auth.require(null));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(file.filename(),StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options","nosniff").body(file.data());
    }
}
