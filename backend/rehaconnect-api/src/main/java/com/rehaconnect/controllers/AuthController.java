package com.rehaconnect.controllers;

import com.rehaconnect.clients.InternalAuthClient;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final InternalAuthClient auth;
    public AuthController(InternalAuthClient auth){this.auth=auth;}
    @GetMapping("/me")
    public ResponseEntity<Map<String,Object>> me(HttpServletRequest request){
        var identity=auth.require(null);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("user",identity,"csrfToken",auth.csrf(request)));
    }
}
