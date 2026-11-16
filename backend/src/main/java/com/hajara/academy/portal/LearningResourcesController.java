package com.hajara.academy.portal;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.time.Instant;
import java.nio.charset.StandardCharsets;

@RestController @RequestMapping("/api/portal")
public class LearningResourcesController {
 private final JdbcTemplate db; private final CurrentUser current; private final EnrollmentRepo enrollments; private final AuditLog audit;
 public LearningResourcesController(JdbcTemplate db,CurrentUser current,EnrollmentRepo enrollments,AuditLog audit){this.db=db;this.current=current;this.enrollments=enrollments;this.audit=audit;}
 private ResponseStatusException bad(String s){return new ResponseStatusException(HttpStatus.BAD_REQUEST,s);}
 private String title(String s){if(s==null||s.isBlank()||s.length()>200)throw bad("Title is required (maximum 200 characters)");return s.trim();}
 private void batch(Long id){if(id!=null&&db.queryForObject("SELECT COUNT(*) FROM academy_batches WHERE id=?",Integer.class,id)==0)throw bad("Batch not found");}
 private void access(Authentication a,Long batchId){var u=current.require(a);if("ADMIN".equals(u.role))return;if(!"STUDENT".equals(u.role)||enrollments.findByUserId(u.id).stream().noneMatch(e->"ACTIVE".equals(e.status)&&(e.expiresAt==null||e.expiresAt.isAfter(Instant.now()))&&(batchId==null||batchId.equals(e.batchId))))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"An active enrollment is required");}
 private boolean visible(Authentication a,Object id){try{access(a,id==null?null:((Number)id).longValue());return true;}catch(ResponseStatusException e){return false;}}
 private void log(Authentication a,HttpServletRequest r,String action){audit.record(current.require(a).id,action,r,"Learning resources");}
 @GetMapping("/admin/notes") public List<Map<String,Object>> notes(){return db.queryForList("SELECT id,title,batch_id,file_name,media_type,created_at,OCTET_LENGTH(file_data) AS size_bytes FROM academy_notes ORDER BY id DESC");}
 @GetMapping("/my-notes") public List<Map<String,Object>> myNotes(Authentication a){access(a,null);return notes().stream().filter(n->visible(a,n.get("batch_id"))).toList();}
 @PostMapping(value="/admin/notes",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
 public Map<String,String> upload(Authentication a,HttpServletRequest r,@RequestParam String title,@RequestParam(required=false) Long batchId,@RequestParam MultipartFile file) throws java.io.IOException {
  title=title(title);batch(batchId);if(file.isEmpty()||file.getSize()>10*1024*1024)throw bad("Choose a file up to 10 MB");
  String name=Optional.ofNullable(file.getOriginalFilename()).orElse("note").replace('\\','/');name=name.substring(name.lastIndexOf('/')+1).replaceAll("[\\r\\n\\x00-\\x1f]","_");if(name.length()>255)throw bad("Filename is too long");
  String ext=name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);byte[] data=file.getBytes();String type=detect(ext,data);if(type==null)throw bad("Upload a valid PDF, PNG, JPG, WEBP, PPT or PPTX file");
  db.update("INSERT INTO academy_notes(title,batch_id,file_name,media_type,file_data) VALUES(?,?,?,?,?)",title,batchId,name,type,data);log(a,r,"NOTE_UPLOADED");return Map.of("message","Note uploaded");
 }
 static String detect(String ext,byte[] d) throws java.io.IOException {
  if(d.length<12)return null;
  if(ext.equals("pdf")&&new String(d,0,5,StandardCharsets.US_ASCII).equals("%PDF-"))return "application/pdf";
  if(ext.equals("png")&&java.util.Arrays.equals(java.util.Arrays.copyOf(d,8),new byte[]{(byte)137,80,78,71,13,10,26,10}))return "image/png";
  if(Set.of("jpg","jpeg").contains(ext)&&(d[0]&255)==255&&(d[1]&255)==216&&(d[2]&255)==255)return "image/jpeg";
  if(ext.equals("webp")&&new String(d,0,4,StandardCharsets.US_ASCII).equals("RIFF")&&new String(d,8,4,StandardCharsets.US_ASCII).equals("WEBP"))return "image/webp";
  if(ext.equals("ppt")&&java.util.Arrays.equals(java.util.Arrays.copyOf(d,8),new byte[]{(byte)208,(byte)207,17,(byte)224,(byte)161,(byte)177,26,(byte)225}))return "application/vnd.ms-powerpoint";
  if(ext.equals("pptx")){try(var zip=new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(d))){java.util.zip.ZipEntry e;long total=0;int entries=0;boolean presentation=false,types=false;byte[] buffer=new byte[8192];while((e=zip.getNextEntry())!=null){if(++entries>2000)return null;String n=e.getName();if(n.equals("ppt/presentation.xml"))presentation=true;if(n.equals("[Content_Types].xml"))types=true;if(n.toLowerCase(Locale.ROOT).endsWith("vbaproject.bin"))return null;int read;while((read=zip.read(buffer))!=-1){total+=read;if(total>50*1024*1024)return null;}}if(presentation&&types)return "application/vnd.openxmlformats-officedocument.presentationml.presentation";}catch(java.util.zip.ZipException e){return null;}}
  return null;
 }
 @GetMapping("/notes/{id}/file") public ResponseEntity<byte[]> download(Authentication a,@PathVariable Long id){var rows=db.queryForList("SELECT * FROM academy_notes WHERE id=?",id);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);var n=rows.get(0);access(a,n.get("batch_id")==null?null:((Number)n.get("batch_id")).longValue());return ResponseEntity.ok().contentType(MediaType.parseMediaType((String)n.get("media_type"))).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename((String)n.get("file_name"),StandardCharsets.UTF_8).build().toString()).header(HttpHeaders.CACHE_CONTROL,"no-store").body((byte[])n.get("file_data"));}
 @DeleteMapping("/admin/notes/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteNote(Authentication a,HttpServletRequest r,@PathVariable Long id){if(db.update("DELETE FROM academy_notes WHERE id=?",id)==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND);log(a,r,"NOTE_DELETED");}
 public record Meeting(String title,String meetUrl,Long batchId){}
 @GetMapping("/admin/meetings") public List<Map<String,Object>> meetings(){return db.queryForList("SELECT * FROM academy_meetings ORDER BY id DESC");}
 @GetMapping("/my-meetings") public List<Map<String,Object>> myMeetings(Authentication a){access(a,null);return meetings().stream().filter(n->visible(a,n.get("batch_id"))).toList();}
 private void validate(Meeting m){title(m.title());batch(m.batchId());try{var u=java.net.URI.create(m.meetUrl());if(!"https".equals(u.getScheme())||!"meet.google.com".equalsIgnoreCase(u.getHost())||u.getUserInfo()!=null||u.getPort()!=-1||!u.getPath().matches("/[a-z]{3}-[a-z]{4}-[a-z]{3}")||u.getQuery()!=null||u.getFragment()!=null)throw new Exception();}catch(Exception e){throw bad("Use a Google Meet link such as https://meet.google.com/abc-defg-hij");}}
 @PostMapping("/admin/meetings") public Map<String,String> create(Authentication a,HttpServletRequest r,@RequestBody Meeting m){validate(m);db.update("INSERT INTO academy_meetings(title,meet_url,batch_id) VALUES(?,?,?)",title(m.title()),m.meetUrl(),m.batchId());log(a,r,"MEETING_SAVED");return Map.of("message","Class link saved");}
 @PutMapping("/admin/meetings/{id}") public Map<String,String> update(Authentication a,HttpServletRequest r,@PathVariable Long id,@RequestBody Meeting m){validate(m);if(db.update("UPDATE academy_meetings SET title=?,meet_url=?,batch_id=? WHERE id=?",title(m.title()),m.meetUrl(),m.batchId(),id)==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND);log(a,r,"MEETING_SAVED");return Map.of("message","Class link saved");}
 @DeleteMapping("/admin/meetings/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteMeeting(Authentication a,HttpServletRequest r,@PathVariable Long id){if(db.update("DELETE FROM academy_meetings WHERE id=?",id)==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND);log(a,r,"MEETING_DELETED");}
}
