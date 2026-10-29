package com.rehaconnect.controllers;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.io.IOException;
import java.util.Map;
@RestControllerAdvice
public class StorageErrors {
    @ExceptionHandler(IOException.class)
    public ResponseEntity<Map<String,String>> storageUnavailable(){return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error","storage_unavailable"));}
}
