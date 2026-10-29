package com.rehaconnect;

import com.clisonix.longo.Document;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rehaconnect.clients.InternalAuthClient.Identity;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.time.*;
import java.util.*;

/** Tenant records, membership and audit commit in the same durable Longo document. */
@Service
public class WorkspaceService {
    private static final Set<String> TYPES=Set.of("patients","appointments","medications","events","documents","messages","meals","information","rooms");
    private static final Map<String,List<String>> FIELDS=Map.of(
        "patients",List.of("email","admission_date","discharge_date"),
        "appointments",List.of("starts_at","ends_at","location","practitioner"),
        "medications",List.of("dose","time"),
        "events",List.of("starts_at","ends_at","location","category"),
        "documents",List.of(),"messages",List.of(),"meals",List.of("date","meal","allergens"),"information",List.of("category"),"rooms",List.of("category","capacity"));
    private final ClinicStore clinics;
    private final ObjectMapper mapper=new ObjectMapper();
    public WorkspaceService(ClinicStore clinics){this.clinics=clinics;}
    private ResponseStatusException error(HttpStatus status){return new ResponseStatusException(status);}
    private Map<String,Object> read(String clinic){
        Document doc=clinics.storage().get("rehaconnect","clinics",clinic);
        if(doc==null)throw error(HttpStatus.NOT_FOUND);
        Map<String,Object> data=mapper.convertValue(doc.toMap(),new TypeReference<LinkedHashMap<String,Object>>(){});
        data.computeIfAbsent("members",key->new ArrayList<Map<String,Object>>());
        data.computeIfAbsent("records",key->new ArrayList<Map<String,Object>>());
        data.computeIfAbsent("audit",key->new ArrayList<Map<String,Object>>());
        return data;
    }
    @SuppressWarnings("unchecked") private List<Map<String,Object>> rows(Map<String,Object> data,String field){return (List<Map<String,Object>>)data.get(field);}
    private String email(String value){return value==null?"":value.trim().toLowerCase(Locale.ROOT);}
    private String role(Map<String,Object> data,Identity user){
        if(user.id().equals(data.get("owner_id")))return "admin";
        return rows(data,"members").stream().filter(m->email(user.email()).equals(m.get("email")))
                .map(m->String.valueOf(m.get("role"))).findFirst().orElseThrow(()->error(HttpStatus.NOT_FOUND));
    }
    private String patientId(Map<String,Object> data,Identity user){
        return rows(data,"records").stream().filter(r->"patients".equals(r.get("type"))&&email(user.email()).equals(r.get("email"))&& !"archived".equals(r.get("status")))
                .map(r->String.valueOf(r.get("id"))).findFirst().orElse("");
    }
    private void writeRole(String role){if(!Set.of("admin","staff").contains(role))throw error(HttpStatus.FORBIDDEN);}
    private Map<String,Object> summary(Map<String,Object> data,Identity user){
        var result=new LinkedHashMap<String,Object>();
        for(String key:List.of("id","name","address","timezone","created_at"))result.put(key,data.get(key));
        result.put("updated_at",data.getOrDefault("updated_at",data.get("created_at")));
        result.put("role",role(data,user));result.put("owner",user.id().equals(data.get("owner_id")));return result;
    }
    public synchronized List<Map<String,Object>> clinics(Identity user){
        var result=new ArrayList<Map<String,Object>>();
        for(Document doc:clinics.storage().findAll("rehaconnect","clinics")){
            var data=read(doc.getId());
            try{result.add(summary(data,user));}catch(ResponseStatusException e){if(e.getStatusCode()!=HttpStatus.NOT_FOUND)throw e;}
        }return result;
    }
    private boolean visible(Map<String,Object> data,Map<String,Object> row,Identity user,String role){
        if(!"patient".equals(role))return true;
        String patient=patientId(data,user),type=String.valueOf(row.get("type"));
        if(type.equals("patients"))return !patient.isBlank()&&patient.equals(row.get("id"));
        if(!"published".equals(row.get("status")))return false;
        String target=String.valueOf(row.getOrDefault("patient_id",""));
        if(Set.of("appointments","medications").contains(type))return !patient.isBlank()&&patient.equals(target);
        return target.isBlank()||(!patient.isBlank()&&patient.equals(target));
    }
    private Map<String,Object> view(Map<String,Object> row,Identity user,String role){
        var result=new LinkedHashMap<>(row);result.remove("attachment");
        Object registrations=result.remove("registrations");
        if(registrations instanceof List<?> list){result.put("registered",list.contains(user.id()));if(!role.equals("patient"))result.put("registration_count",list.size());}
        Object intakes=result.remove("intakes");
        if(intakes instanceof List<?> list)result.put("intakes",list.stream().filter(v->v instanceof Map<?,?> m&&user.id().equals(m.get("user_id"))).toList());
        return result;
    }
    public synchronized List<Map<String,Object>> list(String clinic,String type,Identity user){
        if(!TYPES.contains(type))throw error(HttpStatus.NOT_FOUND);
        var data=read(clinic);String role=role(data,user);
        return rows(data,"records").stream().filter(r->type.equals(r.get("type"))&&visible(data,r,user,role)).map(r->view(r,user,role)).toList();
    }
    public synchronized Map<String,Object> overview(String clinic,Identity user){
        var data=read(clinic);String role=role(data,user);var result=new LinkedHashMap<String,Object>();
        for(String type:TYPES)result.put(type,rows(data,"records").stream().filter(r->type.equals(r.get("type"))&&visible(data,r,user,role)).map(r->view(r,user,role)).toList());
        return result;
    }
    public synchronized Map<String,Object> profile(String clinic,Map<String,Object> body,Identity user)throws IOException{
        var data=read(clinic);if(!role(data,user).equals("admin"))throw error(HttpStatus.FORBIDDEN);
        if(!Objects.equals(body.get("version"),data.getOrDefault("updated_at",data.get("created_at"))))throw error(HttpStatus.CONFLICT);
        String name=text(body,"name",160,true),address=text(body,"address",300,true),zone=text(body,"timezone",80,true);
        try{ZoneId.of(zone);}catch(Exception e){throw error(HttpStatus.BAD_REQUEST);}
        data.put("name",name);data.put("address",address);data.put("timezone",zone);data.put("updated_at",Instant.now().toString());
        audit(data,user,"update:clinic",clinic);commit(clinic,data);return summary(data,user);
    }
    private Map<String,Object> record(Map<String,Object> data,String type,String id){
        return rows(data,"records").stream().filter(r->type.equals(r.get("type"))&&id.equals(r.get("id"))).findFirst().orElseThrow(()->error(HttpStatus.NOT_FOUND));
    }
    private String text(Map<String,Object> body,String key,int max,boolean required){
        Object value=body.get(key);
        if(value==null&&!required)return "";
        if(!(value instanceof String string)||string.length()>max||(required&&string.isBlank()))throw error(HttpStatus.BAD_REQUEST);
        return ((String)value).trim();
    }
    private void date(Map<String,Object> row,String field,boolean required){
        String value=String.valueOf(row.getOrDefault(field,""));
        if(value.isBlank()){if(required)throw error(HttpStatus.BAD_REQUEST);return;}
        try{LocalDate.parse(value);}catch(Exception e){throw error(HttpStatus.BAD_REQUEST);}
    }
    private void validate(Map<String,Object> data,Map<String,Object> row,String type){
        String patient=String.valueOf(row.get("patient_id"));
        if(Set.of("appointments","medications").contains(type)&&patient.isBlank())throw error(HttpStatus.BAD_REQUEST);
        if(!patient.isBlank()){
            var target=record(data,"patients",patient);
            if("archived".equals(target.get("status")))throw error(HttpStatus.BAD_REQUEST);
        }
        if(Set.of("appointments","events").contains(type)){
            try{if(!Instant.parse((String)row.get("ends_at")).isAfter(Instant.parse((String)row.get("starts_at"))))throw error(HttpStatus.BAD_REQUEST);}
            catch(Exception e){throw error(HttpStatus.BAD_REQUEST);}
            if(type.equals("appointments")&&"published".equals(row.get("status"))){
                for(var existing:rows(data,"records"))if(type.equals(existing.get("type"))&&"published".equals(existing.get("status"))&&!row.get("id").equals(existing.get("id"))
                        &&Instant.parse((String)row.get("starts_at")).isBefore(Instant.parse((String)existing.get("ends_at")))
                        &&Instant.parse((String)row.get("ends_at")).isAfter(Instant.parse((String)existing.get("starts_at")))){
                    boolean conflict=row.get("patient_id").equals(existing.get("patient_id"));
                    for(String field:List.of("location","practitioner"))if(!String.valueOf(row.get(field)).isBlank()&&String.valueOf(row.get(field)).equalsIgnoreCase(String.valueOf(existing.get(field))))conflict=true;
                    if(conflict)throw error(HttpStatus.CONFLICT);
                }
            }
        }
        if(type.equals("patients")){
            String email=email((String)row.get("email"));
            if(!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))throw error(HttpStatus.BAD_REQUEST);
            row.put("email",email);date(row,"admission_date",false);date(row,"discharge_date",false);
            if(!String.valueOf(row.get("admission_date")).isBlank()&&!String.valueOf(row.get("discharge_date")).isBlank()
                    &&LocalDate.parse((String)row.get("discharge_date")).isBefore(LocalDate.parse((String)row.get("admission_date"))))throw error(HttpStatus.BAD_REQUEST);
            for(var existing:rows(data,"records"))if("patients".equals(existing.get("type"))&&!existing.get("id").equals(row.get("id"))
                    &&!"archived".equals(existing.get("status"))&&email.equals(existing.get("email"))&& !"archived".equals(row.get("status")))throw error(HttpStatus.CONFLICT);
        }
        if(type.equals("meals")){date(row,"date",true);if(!Set.of("breakfast","lunch","dinner").contains(row.get("meal")))throw error(HttpStatus.BAD_REQUEST);}
        if(type.equals("medications")){try{LocalTime.parse((String)row.get("time"));}catch(Exception e){throw error(HttpStatus.BAD_REQUEST);}}
        if(type.equals("rooms")){
            String capacity=(String)row.get("capacity");if(!capacity.isBlank()&&!capacity.matches("[1-9][0-9]{0,3}"))throw error(HttpStatus.BAD_REQUEST);
            for(var existing:rows(data,"records"))if(type.equals(existing.get("type"))&&!existing.get("id").equals(row.get("id"))&&!"archived".equals(existing.get("status"))
                    &&!"archived".equals(row.get("status"))&&String.valueOf(existing.get("title")).equalsIgnoreCase((String)row.get("title")))throw error(HttpStatus.CONFLICT);
        }
    }
    private void audit(Map<String,Object> data,Identity user,String action,String id){
        var events=rows(data,"audit");events.add(new LinkedHashMap<>(Map.of("id",UUID.randomUUID().toString(),"actor_id",user.id(),"actor_email",user.email(),"action",action,"record_id",id,"at",Instant.now().toString())));
        if(events.size()>2000)events.remove(0);
    }
    private void commit(String clinic,Map<String,Object> data) throws IOException{clinics.storage().replace("rehaconnect","clinics",clinic,data);}
    public synchronized Map<String,Object> save(String clinic,String type,String id,Map<String,Object> body,Identity user) throws IOException{
        if(!TYPES.contains(type))throw error(HttpStatus.NOT_FOUND);
        var data=read(clinic);String role=role(data,user);writeRole(role);
        Map<String,Object> previous=id==null?null:record(data,type,id);
        if(previous!=null&&!Objects.equals(previous.get("updated_at"),body.get("version")))throw error(HttpStatus.CONFLICT);
        var row=new LinkedHashMap<String,Object>();String identifier=id==null?UUID.randomUUID().toString():id;
        row.put("id",identifier);row.put("type",type);row.put("clinic_id",clinic);
        row.put("title",text(body,"title",200,true));row.put("body",text(body,"body",20000,false));
        row.put("status",text(body,"status",20,true));if(!Set.of("draft","published","archived").contains(row.get("status")))throw error(HttpStatus.BAD_REQUEST);
        row.put("patient_id",text(body,"patient_id",100,false));
        for(String field:FIELDS.get(type))row.put(field,text(body,field,field.equals("allergens")?2000:400,false));
        validate(data,row,type);
        row.put("created_at",previous==null?Instant.now().toString():previous.get("created_at"));row.put("updated_at",Instant.now().toString());
        if(previous!=null)for(String field:List.of("attachment","filename","registrations","intakes"))if(previous.containsKey(field))row.put(field,previous.get(field));
        if(type.equals("documents")){
            String encoded=text(body,"content_base64",7_000_000,false);
            if(!encoded.isBlank()){
                byte[] bytes;try{bytes=Base64.getDecoder().decode(encoded);}catch(Exception e){throw error(HttpStatus.BAD_REQUEST);}
                if(bytes.length<5||bytes.length>5_000_000||!new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-"))throw error(HttpStatus.BAD_REQUEST);
                row.put("attachment",encoded);row.put("filename",text(body,"filename",200,true).replaceAll("[\\r\\n\\\\/]","_"));
            }
            if(!row.containsKey("attachment"))throw error(HttpStatus.BAD_REQUEST);
        }
        if(previous!=null)rows(data,"records").remove(previous);
        rows(data,"records").add(row);audit(data,user,(previous==null?"create:":"update:")+type,identifier);commit(clinic,data);
        return view(row,user,role);
    }
    public synchronized void archive(String clinic,String type,String id,Identity user) throws IOException{
        var data=read(clinic);writeRole(role(data,user));var row=record(data,type,id);row.put("status","archived");row.put("updated_at",Instant.now().toString());
        audit(data,user,"archive:"+type,id);commit(clinic,data);
    }
    public synchronized List<Map<String,Object>> members(String clinic,Identity user){
        var data=read(clinic);if(!role(data,user).equals("admin"))throw error(HttpStatus.FORBIDDEN);return rows(data,"members");
    }
    public synchronized void member(String clinic,String address,String role,Identity user) throws IOException{
        var data=read(clinic);if(!role(data,user).equals("admin"))throw error(HttpStatus.FORBIDDEN);
        String normalized=email(address);
        if(role==null||normalized.length()>254||!normalized.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")||!Set.of("admin","staff","patient","removed").contains(role))throw error(HttpStatus.BAD_REQUEST);
        rows(data,"members").removeIf(m->normalized.equals(m.get("email")));
        if(!role.equals("removed"))rows(data,"members").add(new LinkedHashMap<>(Map.of("email",normalized,"role",role)));
        audit(data,user,"membership:"+role,normalized);commit(clinic,data);
    }
    public synchronized List<Map<String,Object>> audit(String clinic,Identity user){
        var data=read(clinic);if(!role(data,user).equals("admin"))throw error(HttpStatus.FORBIDDEN);return rows(data,"audit");
    }
    public synchronized Map<String,Object> action(String clinic,String type,String id,String action,Identity user) throws IOException{
        var data=read(clinic);String role=role(data,user);var row=record(data,type,id);
        if(!visible(data,row,user,role)||!role.equals("patient"))throw error(HttpStatus.FORBIDDEN);
        if(type.equals("events")&&Set.of("register","unregister").contains(action)){
            if(action.equals("register")&&Instant.parse((String)row.get("ends_at")).isBefore(Instant.now()))throw error(HttpStatus.CONFLICT);
            @SuppressWarnings("unchecked") var participants=(List<String>)row.computeIfAbsent("registrations",k->new ArrayList<String>());
            participants.remove(user.id());if(action.equals("register"))participants.add(user.id());
        }else if(type.equals("medications")&&action.equals("taken")){
            @SuppressWarnings("unchecked") var intakes=(List<Map<String,Object>>)row.computeIfAbsent("intakes",k->new ArrayList<Map<String,Object>>());
            if(intakes.size()>=2000)throw error(HttpStatus.CONFLICT);
            intakes.add(new LinkedHashMap<>(Map.of("user_id",user.id(),"at",Instant.now().toString())));
        }else throw error(HttpStatus.BAD_REQUEST);
        audit(data,user,action+":"+type,id);commit(clinic,data);return view(row,user,role);
    }
    public record Download(String filename,byte[] data){}
    public synchronized List<Map<String,Object>> feedback(String clinic,Identity user){
        var data=read(clinic);String role=role(data,user);
        return rows(data,"records").stream().filter(r->"feedback".equals(r.get("type"))&&(!role.equals("patient")||user.id().equals(r.get("author_id"))))
                .map(r->new LinkedHashMap<String,Object>(r)).map(r->(Map<String,Object>)r).toList();
    }
    public synchronized void feedback(String clinic,String body,Identity user)throws IOException{
        var data=read(clinic);role(data,user);
        if(body==null||body.isBlank()||body.length()>5000)throw error(HttpStatus.BAD_REQUEST);
        String id=UUID.randomUUID().toString();
        rows(data,"records").add(new LinkedHashMap<>(Map.of("id",id,"clinic_id",clinic,"type","feedback","body",body.trim(),"author_id",user.id(),"author_email",user.email(),"created_at",Instant.now().toString())));
        audit(data,user,"create:feedback",id);commit(clinic,data);
    }
    public synchronized Download download(String clinic,String id,Identity user){
        var data=read(clinic);String role=role(data,user);var row=record(data,"documents",id);
        if(!visible(data,row,user,role))throw error(HttpStatus.NOT_FOUND);
        return new Download((String)row.get("filename"),Base64.getDecoder().decode((String)row.get("attachment")));
    }
}
