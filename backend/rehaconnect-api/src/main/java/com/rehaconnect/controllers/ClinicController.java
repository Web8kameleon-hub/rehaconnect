package com.rehaconnect.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.List;
import java.io.IOException;
import com.rehaconnect.ClinicStore;
import com.rehaconnect.clients.InternalAuthClient;
import com.rehaconnect.WorkspaceService;

@RestController
@RequestMapping("/api/clinics")
public class ClinicController {
    private final ClinicStore clinics;
    private final InternalAuthClient auth;
    private final WorkspaceService workspace;
    public ClinicController(ClinicStore clinics, InternalAuthClient auth,WorkspaceService workspace) { this.clinics=clinics; this.auth=auth;this.workspace=workspace; }
    @GetMapping
    public List<Map<String,Object>> list(@RequestHeader(value="Authorization",required=false) String token) {
        return workspace.clinics(auth.require(token));
    }
    @PostMapping
    public Map<String, Object> createClinic(@RequestBody Map<String, Object> clinicData,
            @RequestHeader(value="Authorization",required=false) String token) throws IOException {
        return clinics.create(auth.require(token).id(),clinicData);
    }
    @PutMapping("/{id}")
    public Map<String,Object> profile(@PathVariable String id,@RequestBody Map<String,Object> body)throws IOException{return workspace.profile(id,body,auth.require(null));}
}
