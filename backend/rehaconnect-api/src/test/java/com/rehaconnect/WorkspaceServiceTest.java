package com.rehaconnect;

import com.rehaconnect.clients.InternalAuthClient.Identity;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Isolated synthetic fixtures exercise real persisted Longo storage, never application data. */
class WorkspaceServiceTest {
    @TempDir Path directory;
    ClinicStore store;WorkspaceService service;String clinic;
    Identity owner=new Identity("owner-fixture","owner@example.test"),staff=new Identity("staff-fixture","staff@example.test"),
            patient=new Identity("patient-fixture","patient@example.test"),other=new Identity("other-fixture","other@example.test");
    @BeforeEach void setup()throws Exception{
        store=new ClinicStore(directory.resolve("store.bin").toString());service=new WorkspaceService(store);
        clinic=(String)store.create(owner.id(),Map.of("name","Isolated test clinic","address","Test-only address","timezone","Europe/Berlin")).get("id");
    }
    Map<String,Object> payload(String title){return new LinkedHashMap<>(Map.of("title",title,"body","","status","published"));}
    String addPatient(Identity who)throws Exception{
        var body=payload("Isolated patient fixture");body.put("email",who.email());
        return (String)service.save(clinic,"patients",null,body,owner).get("id");
    }
    void denied(int code,org.junit.jupiter.api.function.Executable action){assertEquals(code,assertThrows(ResponseStatusException.class,action).getStatusCode().value());}
    @Test void unrelatedAccountCannotReadOrWriteAnotherClinic()throws Exception{
        service.save(clinic,"messages",null,payload("Test announcement"),owner);
        assertTrue(service.clinics(other).isEmpty());
        denied(404,()->service.list(clinic,"messages",other));
        denied(404,()->service.save(clinic,"messages",null,payload("Rejected"),other));
    }
    @Test void membershipSurvivesRestartAndRemovalRevokesAccess()throws Exception{
        service.member(clinic,staff.email(),"staff",owner);
        var restarted=new WorkspaceService(new ClinicStore(directory.resolve("store.bin").toString()));
        assertEquals("staff",restarted.clinics(staff).get(0).get("role"));
        restarted.member(clinic,staff.email(),"removed",owner);
        denied(404,()->restarted.list(clinic,"patients",staff));
    }
    @Test void patientCannotPublishOrEscalatePrivileges()throws Exception{
        service.member(clinic,patient.email(),"patient",owner);
        denied(403,()->service.save(clinic,"messages",null,payload("Rejected"),patient));
        denied(403,()->service.member(clinic,patient.email(),"admin",patient));
        denied(403,()->service.audit(clinic,patient));
    }
    @Test void staffCanManageContentButCannotAssignRoles()throws Exception{
        service.member(clinic,staff.email(),"staff",owner);
        service.save(clinic,"messages",null,payload("Staff announcement"),staff);
        assertEquals(1,service.list(clinic,"messages",owner).size());
        denied(403,()->service.member(clinic,other.email(),"staff",staff));
    }
    @Test void patientSeesOnlyPublishedGeneralContentAndOwnAppointments()throws Exception{
        String own=addPatient(patient),theirs=addPatient(other);
        service.member(clinic,patient.email(),"patient",owner);
        var draft=payload("Draft");draft.put("status","draft");service.save(clinic,"messages",null,draft,owner);
        service.save(clinic,"messages",null,payload("Public"),owner);
        for(String id:List.of(own,theirs)){
            var appointment=payload("Fixture appointment");appointment.putAll(Map.of("patient_id",id,"starts_at","2030-01-01T10:00:00Z","ends_at","2030-01-01T11:00:00Z"));service.save(clinic,"appointments",null,appointment,owner);
        }
        assertEquals(1,service.list(clinic,"messages",patient).size());
        assertEquals(1,service.list(clinic,"appointments",patient).size());
        assertEquals(own,service.list(clinic,"appointments",patient).get(0).get("patient_id"));
        assertEquals(1,service.list(clinic,"patients",patient).size());
    }
    @Test void documentDownloadChecksTargetPatientAndReturnsExactBytes()throws Exception{
        String target=addPatient(other);service.member(clinic,patient.email(),"patient",owner);
        byte[] bytes="%PDF-1.4\n% isolated download fixture\n%%EOF".getBytes(StandardCharsets.US_ASCII);
        var body=payload("PDF fixture");body.putAll(Map.of("filename","fixture.pdf","content_base64",Base64.getEncoder().encodeToString(bytes),"patient_id",target));
        var saved=service.save(clinic,"documents",null,body,owner);String id=(String)saved.get("id");
        assertFalse(saved.containsKey("attachment"));assertArrayEquals(bytes,service.download(clinic,id,owner).data());
        denied(404,()->service.download(clinic,id,patient));
    }
    @Test void spoofedTenantFieldsAreIgnoredAndCrossTenantPatientIsRejected()throws Exception{
        String otherClinic=(String)store.create(other.id(),Map.of("name","Other test clinic","address","Test address","timezone","UTC")).get("id");
        var person=payload("Other fixture");person.put("email",other.email());String patientId=(String)service.save(otherClinic,"patients",null,person,other).get("id");
        var body=payload("Spoof test");body.put("clinic_id",otherClinic);body.put("owner_id",other.id());
        var saved=service.save(clinic,"messages",null,body,owner);assertEquals(clinic,saved.get("clinic_id"));assertFalse(saved.containsKey("owner_id"));
        body.putAll(Map.of("patient_id",patientId,"time","08:00"));denied(404,()->service.save(clinic,"medications",null,body,owner));
    }
    @Test void invalidScheduleOrDocumentDoesNotPersist()throws Exception{
        String target=addPatient(patient);var body=payload("Invalid time");body.putAll(Map.of("patient_id",target,"starts_at","2030-01-01T11:00:00Z","ends_at","2030-01-01T10:00:00Z"));
        denied(400,()->service.save(clinic,"appointments",null,body,owner));assertTrue(service.list(clinic,"appointments",owner).isEmpty());
        var file=payload("Invalid PDF");file.putAll(Map.of("content_base64",Base64.getEncoder().encodeToString("not PDF".getBytes()),"filename","file.pdf"));
        denied(400,()->service.save(clinic,"documents",null,file,owner));assertTrue(service.list(clinic,"documents",owner).isEmpty());
    }
    @Test void archiveAndAuditPersistTogether()throws Exception{
        String id=(String)service.save(clinic,"events",null,new LinkedHashMap<>(Map.of("title","Event fixture","status","published","starts_at","2030-01-01T10:00:00Z","ends_at","2030-01-01T11:00:00Z")),owner).get("id");
        service.archive(clinic,"events",id,owner);
        var restarted=new WorkspaceService(new ClinicStore(directory.resolve("store.bin").toString()));
        assertEquals("archived",restarted.list(clinic,"events",owner).get(0).get("status"));
        assertTrue(restarted.audit(clinic,owner).stream().anyMatch(a->"archive:events".equals(a.get("action"))));
    }
    @Test void feedbackAndIntakeAreBoundToTheirAuthors()throws Exception{
        String id=addPatient(patient);addPatient(other);
        service.member(clinic,patient.email(),"patient",owner);service.member(clinic,other.email(),"patient",owner);
        var medication=payload("Clinic-provided fixture plan");medication.putAll(Map.of("patient_id",id,"time","08:00"));String medicationId=(String)service.save(clinic,"medications",null,medication,owner).get("id");
        service.action(clinic,"medications",medicationId,"taken",patient);
        denied(403,()->service.action(clinic,"medications",medicationId,"taken",other));
        service.feedback(clinic,"Isolated feedback",patient);
        assertEquals(1,service.feedback(clinic,owner).size());assertTrue(service.feedback(clinic,other).isEmpty());
        assertEquals(1,((List<?>)service.list(clinic,"medications",patient).get(0).get("intakes")).size());
    }
    @Test void staleEditorCannotOverwriteNewerChanges()throws Exception{
        var initial=service.save(clinic,"messages",null,payload("Original"),owner);String id=(String)initial.get("id");
        var first=payload("Updated by first editor");first.put("version",initial.get("updated_at"));
        service.save(clinic,"messages",id,first,owner);
        var stale=payload("Rejected stale edit");stale.put("version",initial.get("updated_at"));
        denied(409,()->service.save(clinic,"messages",id,stale,owner));
        assertEquals("Updated by first editor",service.list(clinic,"messages",owner).get(0).get("title"));
    }
    @Test void publishedAppointmentsCannotOverlapForSamePatient()throws Exception{
        String target=addPatient(patient);var first=payload("First appointment");first.putAll(Map.of("patient_id",target,"starts_at","2030-01-01T10:00:00Z","ends_at","2030-01-01T11:00:00Z"));
        service.save(clinic,"appointments",null,first,owner);
        var second=payload("Overlapping appointment");second.putAll(Map.of("patient_id",target,"starts_at","2030-01-01T10:30:00Z","ends_at","2030-01-01T11:30:00Z"));
        denied(409,()->service.save(clinic,"appointments",null,second,owner));assertEquals(1,service.list(clinic,"appointments",owner).size());
    }
    @Test void clinicProfileIsAdminOnlyAndPreservesRecords()throws Exception{
        service.member(clinic,staff.email(),"staff",owner);service.save(clinic,"messages",null,payload("Preserved announcement"),owner);
        var before=service.clinics(owner).get(0);var body=new LinkedHashMap<String,Object>(Map.of("name","Renamed test clinic","address","Updated test address","timezone","UTC","version",before.get("updated_at")));
        denied(403,()->service.profile(clinic,body,staff));
        var updated=service.profile(clinic,body,owner);assertEquals("UTC",updated.get("timezone"));
        assertEquals(1,service.list(clinic,"messages",owner).size());denied(409,()->service.profile(clinic,body,owner));
    }
    @Test void duplicateRoomsAreRejectedUntilOriginalIsArchived()throws Exception{
        var room=payload("Isolated room");room.put("capacity","2");var saved=service.save(clinic,"rooms",null,room,owner);
        denied(409,()->service.save(clinic,"rooms",null,room,owner));service.archive(clinic,"rooms",(String)saved.get("id"),owner);
        service.save(clinic,"rooms",null,room,owner);assertEquals(2,service.list(clinic,"rooms",owner).size());
    }
}
