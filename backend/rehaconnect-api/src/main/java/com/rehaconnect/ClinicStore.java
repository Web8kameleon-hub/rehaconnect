package com.rehaconnect;

import com.clisonix.longo.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneId;
import java.util.*;

@Component
public class ClinicStore {
    private final LongoStore store;
    public ClinicStore(@Value("${rehaconnect.storage-path:./data/rehaconnect.bin}") String path) throws IOException {
        store = new LongoStore(Path.of(path));
    }
    public synchronized Map<String,Object> create(String owner, Map<String,Object> body) throws IOException {
        String name = text(body, "name", 160), address = text(body, "address", 300), zone = text(body,"timezone",80);
        try { ZoneId.of(zone); } catch (Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid time zone"); }
        return store.insert("rehaconnect", "clinics", Map.of("name",name,"address",address,"timezone",zone,
                "owner_id",owner,"created_at",Instant.now().toString())).toMap();
    }
    public List<Map<String,Object>> owned(String owner) {
        return store.findExact("rehaconnect","clinics",Map.of("owner_id",owner),null,1000)
                .stream().map(Document::toMap).toList();
    }
    public Map<String,Object> requireOwner(String id, String owner) {
        Document clinic = store.get("rehaconnect","clinics",id);
        if (clinic == null || !owner.equals(clinic.get("owner_id"))) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return clinic.toMap();
    }
    LongoStore storage() { return store; }
    private static String text(Map<String,Object> body, String key, int max) {
        if (!(body.get(key) instanceof String value) || value.isBlank() || value.trim().length()>max)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid clinic field");
        return value.trim();
    }
}
