package com.hajara.academy.portal;

import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import com.google.zxing.*;
import com.google.zxing.common.BitMatrix;
import org.springframework.beans.factory.annotation.Value;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** Admin-only manual PDF fallback, stored durably in TiDB, with separate preview and issue steps. */
@RestController
@RequestMapping("/api/portal/admin/manual-certificates")
public class ManualCertificateController {
 @Value("${app.public-url:${APP_PUBLIC_URL:https://hajra-ilm-academy.pages.dev}}") private String publicUrl;
 private final JdbcTemplate db;
 private final CurrentUser current;
 public ManualCertificateController(JdbcTemplate db,CurrentUser current){this.db=db;this.current=current;}
 private void admin(Authentication auth){if(!"ADMIN".equals(current.require(auth).role))throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
 private Map<String,Object> draft(Long id){
  var rows=db.queryForList("SELECT id,enrollment_id,certificate_code,student_name,completion_date,created_at FROM academy_certificate_manual_drafts WHERE id=?",id);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Manual draft not found");
  return rows.get(0);
 }
 @GetMapping public List<Map<String,Object>> list(Authentication auth){
  admin(auth);
  return db.queryForList("SELECT d.id,d.enrollment_id,d.certificate_code,d.student_name,d.completion_date,u.student_number FROM academy_certificate_manual_drafts d JOIN portal_enrollments e ON e.id=d.enrollment_id JOIN portal_users u ON u.id=e.user_id ORDER BY d.id DESC");
 }
 @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
 @Transactional
 public Map<String,Object> upload(Authentication auth,@RequestParam Long enrollmentId,@RequestParam String studentName,@RequestParam String completionDate,@RequestPart("file") MultipartFile file) throws IOException {
  admin(auth);
  if(studentName==null||studentName.isBlank()||studentName.length()>180||studentName.chars().anyMatch(Character::isISOControl))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid student name");
  LocalDate date;
  try {date=LocalDate.parse(completionDate);}catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid completion date");}
  if(file==null||file.isEmpty()||file.getSize()>2_000_000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"PDF must be 2 MB or less");
  byte[] bytes=file.getBytes();
  if(bytes.length<16||bytes[0]!='%'||bytes[1]!='P'||bytes[2]!='D'||bytes[3]!='F'||bytes[4]!='-')throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid PDF file");
  // Simple structural check without parsing large PDFs in the memory-constrained web service.
  String tail=new String(bytes,Math.max(0,bytes.length-2048),Math.min(2048,bytes.length),java.nio.charset.StandardCharsets.ISO_8859_1);
  if(!tail.contains("%%EOF"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Incomplete PDF file");
  var enrollments=db.queryForList("SELECT b.status FROM portal_enrollments e JOIN academy_batches b ON b.id=e.batch_id WHERE e.id=?",enrollmentId);
  if(enrollments.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Enrollment not found");
  if(!"COMPLETED".equals(enrollments.get(0).get("status")))throw new ResponseStatusException(HttpStatus.CONFLICT,"Complete batch first");
  if(db.queryForObject("SELECT COUNT(*) FROM academy_certificates WHERE enrollment_id=?",Integer.class,enrollmentId)>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Certificate already issued");
  var existing=db.queryForList("SELECT id,certificate_code FROM academy_certificate_manual_drafts WHERE enrollment_id=?",enrollmentId);
  if(existing.isEmpty()){
   String code="HIA-"+UUID.randomUUID().toString().substring(0,12).toUpperCase(Locale.ROOT);
   db.update("INSERT INTO academy_certificate_manual_drafts(enrollment_id,certificate_code,student_name,completion_date,pdf_data) VALUES(?,?,?,?,?)",enrollmentId,code,studentName.strip(),date,bytes);
  } else {
   db.update("UPDATE academy_certificate_manual_drafts SET student_name=?,completion_date=?,pdf_data=? WHERE enrollment_id=?",studentName.strip(),date,bytes,enrollmentId);
  }
  return db.queryForMap("SELECT id,enrollment_id,certificate_code,student_name,completion_date FROM academy_certificate_manual_drafts WHERE enrollment_id=?",enrollmentId);
 }
 @GetMapping("/{id}/preview") public ResponseEntity<byte[]> preview(Authentication auth,@PathVariable Long id){
  admin(auth);draft(id);
  byte[] data=db.queryForObject("SELECT pdf_data FROM academy_certificate_manual_drafts WHERE id=?",(rs,n)->rs.getBytes(1),id);
  return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION,"inline; filename=certificate-draft.pdf").header(HttpHeaders.CACHE_CONTROL,"no-store").body(data);
 }
 @GetMapping(value="/{id}/verification-qr",produces=MediaType.IMAGE_PNG_VALUE)
 public ResponseEntity<byte[]> qr(Authentication auth,@PathVariable Long id) throws IOException {
  admin(auth);String code=String.valueOf(draft(id).get("certificate_code"));
  String url=publicUrl.replaceAll("/+$","")+"/verify-certificate/"+code;
  try {
   BitMatrix bits=new MultiFormatWriter().encode(url,BarcodeFormat.QR_CODE,192,192);
   BufferedImage img=new BufferedImage(192,192,BufferedImage.TYPE_BYTE_BINARY);
   for(int y=0;y<192;y++)for(int x=0;x<192;x++)img.setRGB(x,y,bits.get(x,y)?0xff000000:0xffffffff);
   try(ByteArrayOutputStream out=new ByteArrayOutputStream()){
    ImageIO.write(img,"png",out);
    return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=certificate-verification-qr.png").header(HttpHeaders.CACHE_CONTROL,"no-store").body(out.toByteArray());
   }
  }catch(WriterException ex){throw new IOException("QR generation failed",ex);}
 }
 @PostMapping("/{id}/issue") @Transactional public Map<String,Object> issue(Authentication auth,@PathVariable Long id){
  admin(auth);var d=draft(id);Long enrollment=((Number)d.get("enrollment_id")).longValue();
  if(db.queryForObject("SELECT COUNT(*) FROM academy_certificates WHERE enrollment_id=?",Integer.class,enrollment)>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Already issued");
  db.update("INSERT INTO academy_certificates(enrollment_id,certificate_code,issued_at,display_name,completion_date) VALUES(?,?,CURRENT_TIMESTAMP(6),?,?)",enrollment,d.get("certificate_code"),d.get("student_name"),d.get("completion_date"));
  Long certId=db.queryForObject("SELECT id FROM academy_certificates WHERE enrollment_id=?",Long.class,enrollment);
  db.update("INSERT INTO academy_certificate_uploaded_pdfs(certificate_id,pdf_data) SELECT ?,pdf_data FROM academy_certificate_manual_drafts WHERE id=?",certId,id);
  db.update("DELETE FROM academy_certificate_manual_drafts WHERE id=?",id);
  db.update("DELETE FROM academy_certificate_drafts WHERE enrollment_id=?",enrollment);
  return Map.of("certificateId",certId,"certificateCode",d.get("certificate_code"));
 }
 @DeleteMapping("/{id}") public Map<String,Object> discard(Authentication auth,@PathVariable Long id){admin(auth);db.update("DELETE FROM academy_certificate_manual_drafts WHERE id=?",id);return Map.of("deleted",true);}
}
