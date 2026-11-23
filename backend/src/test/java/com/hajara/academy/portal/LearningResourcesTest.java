package com.hajara.academy.portal;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.mock.web.MockHttpServletRequest;
import java.util.*;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.util.zip.*;

class LearningResourcesTest {
 final JdbcTemplate db=mock(JdbcTemplate.class);
 final CurrentUser current=mock(CurrentUser.class);
 final EnrollmentRepo enrollments=mock(EnrollmentRepo.class);
 final Authentication auth=mock(Authentication.class);
 final LearningResourcesController c=new LearningResourcesController(db,current,enrollments,mock(AuditLog.class));
 PortalUser student(){var u=new PortalUser();u.id=7L;u.role="STUDENT";when(current.require(auth)).thenReturn(u);return u;}
 PortalEnrollment enrollment(long batch){var e=new PortalEnrollment();e.batchId=batch;e.status="ACTIVE";return e;}
 @Test void acceptsPdfButRejectsDisguisedHtml() throws Exception {
  assertEquals("application/pdf",LearningResourcesController.detect("pdf","%PDF-1.4 content".getBytes(StandardCharsets.US_ASCII)));
  assertNull(LearningResourcesController.detect("pdf","<html>hello</html>".getBytes(StandardCharsets.US_ASCII)));
  assertNull(LearningResourcesController.detect("html","%PDF-1.4 content".getBytes(StandardCharsets.US_ASCII)));
 }
 @Test void validatesPowerPointArchiveContents() throws Exception {
  var bytes=new ByteArrayOutputStream();try(var z=new ZipOutputStream(bytes)){for(String name:List.of("[Content_Types].xml","ppt/presentation.xml")){z.putNextEntry(new ZipEntry(name));z.write("<xml/>".getBytes());z.closeEntry();}}
  assertNotNull(LearningResourcesController.detect("pptx",bytes.toByteArray()));
  assertNull(LearningResourcesController.detect("pptx","not a zip archive".getBytes()));
 }
 @Test void studentCannotDownloadOtherBatchFile(){student();when(enrollments.findByUserId(7L)).thenReturn(List.of(enrollment(1)));when(db.queryForList("SELECT * FROM academy_notes WHERE id=?",9L)).thenReturn(List.of(Map.of("batch_id",2L,"file_data",new byte[1])));assertEquals(403,assertThrows(ResponseStatusException.class,()->c.download(auth,9L)).getStatusCode().value());}
 @Test void inactiveStudentCannotListNotes(){student();var e=enrollment(1);e.expiresAt=Instant.now().minusSeconds(1);when(enrollments.findByUserId(7L)).thenReturn(List.of(e));assertEquals(403,assertThrows(ResponseStatusException.class,()->c.myNotes(auth)).getStatusCode().value());}
 @Test void audienceFilteringKeepsOnlyAllAndOwnBatch(){student();when(enrollments.findByUserId(7L)).thenReturn(List.of(enrollment(1)));var all=new HashMap<String,Object>();all.put("id",1L);all.put("batch_id",null);when(db.queryForList("SELECT * FROM academy_meetings ORDER BY id DESC")).thenReturn(List.of(all,Map.of("id",2L,"batch_id",1L),Map.of("id",3L,"batch_id",2L)));assertEquals(2,c.myMeetings(auth).size());}
 @Test void rejectsImpersonatedMeetHosts(){for(String url:List.of("https://meet.google.com.evil.test/abc-defg-hij","javascript:alert(1)","https://meet.google.com@evil.test/abc-defg-hij","https://meet.google.com/abc-defg-hij?redirect=evil")){assertEquals(400,assertThrows(ResponseStatusException.class,()->c.create(auth,new MockHttpServletRequest(),new LearningResourcesController.Meeting("Class",url,null))).getStatusCode().value());}}
}
