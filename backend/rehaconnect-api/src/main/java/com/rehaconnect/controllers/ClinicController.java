package com.rehaconnect.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.List;
import java.io.IOException;
import com.rehaconnect.ClinicStore;
import com.rehaconnect.clients.InternalAuthClient;

@RestController
@RequestMapping("/api/clinics")
public class ClinicController {
    private final ClinicStore clinics;
    private final InternalAuthClient auth;
    public ClinicController(ClinicStore clinics, InternalAuthClient auth) { this.clinics=clinics; this.auth=auth; }
    @GetMapping
    public List<Map<String,Object>> list(@RequestHeader(value="Authorization",required=false) String token) {
        return clinics.owned(auth.require(token).id());
    }
    @PostMapping
    public Map<String, Object> createClinic(@RequestBody Map<String, Object> clinicData,
            @RequestHeader(value="Authorization",required=false) String token) throws IOException {
        return clinics.create(auth.require(token).id(),clinicData);
    }
}
