package com.hajara.academy.portal;

import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BatchService {
 private final JdbcTemplate jdbc;
 public BatchService(JdbcTemplate jdbc){this.jdbc=jdbc;}
 private static final String OPEN_WINDOW=" AND enrollment_opens_at<=UTC_TIMESTAMP(6) AND (enrollment_closes_at IS NULL OR enrollment_closes_at>UTC_TIMESTAMP(6))";
 /** Newest first, deterministic tie-breaker. */
 public List<Map<String,Object>> list(){return jdbc.queryForList("SELECT b.*, (SELECT COUNT(*) FROM portal_enrollments e WHERE e.batch_id=b.id) AS student_count FROM academy_batches b ORDER BY b.created_at DESC, b.id DESC");}
 public Map<String,Object> get(Long id){
  var rows=jdbc.queryForList("SELECT b.*, (SELECT COUNT(*) FROM portal_enrollments e WHERE e.batch_id=b.id) AS student_count FROM academy_batches b WHERE b.id=?",id);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Batch not found");
  return rows.get(0);
 }
 public Map<String,Object> openBatch(){
  var rows=jdbc.queryForList("SELECT * FROM academy_batches WHERE status='OPEN'"+OPEN_WINDOW+" ORDER BY id DESC LIMIT 1");
  return rows.isEmpty()?Map.of():rows.get(0);
 }
 public Map<String,Object> requireOpen(Long courseId){
  var rows=jdbc.queryForList("SELECT * FROM academy_batches WHERE course_id=? AND status='OPEN'"+OPEN_WINDOW+" LIMIT 1",courseId);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"Enrollment is closed. Please wait for the next batch.");
  return rows.get(0);
 }
 public Map<String,Object> requireManualBatch(Long batchId){
  var rows=jdbc.queryForList("SELECT * FROM academy_batches WHERE id=? AND status IN ('OPEN','CLOSED','DRAFT')",batchId);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"Select a non-completed batch.");
  return rows.get(0);
 }
 /** Enrollment expiry derived from the batch end date; null when no end date is set (access lasts until the batch is completed). */
 public static java.time.Instant endInstant(Map<String,Object> batch){
  Object v=batch.get("classes_end_at");
  return v instanceof java.sql.Timestamp t?t.toInstant():null;
 }
 /** Accepts yyyy-MM-dd or an ISO local date-time; blank means "not set". */
 private static LocalDateTime parse(String v,boolean endOfDay){
  if(v==null||v.isBlank())return null;
  try{
   String t=v.trim();
   if(t.length()==10)return endOfDay?LocalDate.parse(t).atTime(23,59):LocalDate.parse(t).atStartOfDay();
   return LocalDateTime.parse(t);
  }catch(RuntimeException ex){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid date: "+v);}
 }
 private static String link(Map<String,String> b){
  String v=b.get("whatsappLink");if(v==null||v.isBlank())return null;
  v=v.trim();
  if(v.length()>500||!(v.startsWith("https://chat.whatsapp.com/")||v.startsWith("https://wa.me/")||v.startsWith("https://whatsapp.com/")))
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"WhatsApp link must be an https://chat.whatsapp.com/ invite link");
  return v;
 }
 private static String name(Map<String,String> b,String fallback){
  String n=b.getOrDefault("name",fallback==null?"":fallback).trim();
  if(n.isBlank()||n.length()>150)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Batch name is required (max 150 characters)");
  return n;
 }
 private static void checkDates(LocalDateTime starts,LocalDateTime ends){
  if(starts!=null&&ends!=null&&!starts.isBefore(ends))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Class end must be after class start");
 }
 @Transactional
 public Map<String,Object> create(Map<String,String> b){
  String name=name(b,null);
  if(name.equalsIgnoreCase("Test Batch"))throw new ResponseStatusException(HttpStatus.CONFLICT,"Test Batch is already provided by the system");
  LocalDateTime starts=parse(b.get("classesStartAt"),false);
  LocalDateTime ends=parse(b.get("classesEndAt"),true);
  LocalDateTime closes=parse(b.get("enrollmentClosesAt"),true);
  checkDates(starts,ends);
  if(closes!=null&&!closes.isAfter(LocalDateTime.now(ZoneOffset.UTC)))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Registration deadline must be in the future");
  Long courseId=b.get("courseId")==null||b.get("courseId").isBlank()?null:Long.valueOf(b.get("courseId"));
  if(courseId==null){var ids=jdbc.queryForList("SELECT id FROM portal_courses ORDER BY id LIMIT 1",Long.class);courseId=ids.isEmpty()?null:ids.get(0);}
  if(courseId==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The integrated programme record is not configured yet");
  String wa=link(b);
  var fee=b.get("courseFee")==null||b.get("courseFee").isBlank()?java.math.BigDecimal.ZERO:fee(b);
  // Reuse the lowest available number only when the earlier batch was safely deleted.
  // Serialise batch creation by locking the programme row.
  jdbc.queryForList("SELECT id FROM portal_courses WHERE id=? FOR UPDATE",courseId);
  var used=jdbc.queryForList("SELECT batch_number FROM academy_batches ORDER BY batch_number",Integer.class);
  int candidate=1;for(Integer n:used){if(n==candidate)candidate++;else if(n>candidate)break;}
  Integer number=candidate;
  try{
   jdbc.update("INSERT INTO academy_batches(course_id,name,batch_number,enrollment_opens_at,enrollment_closes_at,classes_start_at,classes_end_at,course_fee,whatsapp_link,status) VALUES(?,?,?,?,?,?,?,?,?,'DRAFT')",
    courseId,name,number,LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1),closes,starts,ends,fee,wa);
  }catch(org.springframework.dao.DuplicateKeyException ex){throw new ResponseStatusException(HttpStatus.CONFLICT,"Another batch was created at the same time. Please try again.");}
  Long id=jdbc.queryForObject("SELECT id FROM academy_batches WHERE batch_number=?",Long.class,number);
  return Map.of("message","Batch created","id",id,"batchNumber",number);
 }
 @Transactional
 public Map<String,Object> update(Long id,Map<String,String> b){
  var rows=jdbc.queryForList("SELECT * FROM academy_batches WHERE id=? FOR UPDATE",id);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Batch not found");
  var old=rows.get(0);
  // Completed batch metadata may be corrected by an administrator; its status stays completed.
  String name=name(b,String.valueOf(old.get("name")));
  if(((Number)old.get("batch_number")).intValue()==0)name="Test Batch";
  else if(name.equalsIgnoreCase("Test Batch"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Reserved batch name");
  // A key that is present (even empty) replaces the stored value; an absent key leaves it unchanged.
  LocalDateTime starts=b.containsKey("classesStartAt")?parse(b.get("classesStartAt"),false):ts(old.get("classes_start_at"));
  LocalDateTime ends=b.containsKey("classesEndAt")?parse(b.get("classesEndAt"),true):ts(old.get("classes_end_at"));
  LocalDateTime closes=b.containsKey("enrollmentClosesAt")?parse(b.get("enrollmentClosesAt"),true):ts(old.get("enrollment_closes_at"));
  checkDates(starts,ends);
  String wa=b.containsKey("whatsappLink")?link(b):(String)old.get("whatsapp_link");
  var fee=b.containsKey("courseFee")?fee(b):(java.math.BigDecimal)old.get("course_fee");
  jdbc.update("UPDATE academy_batches SET name=?,enrollment_closes_at=?,classes_start_at=?,classes_end_at=?,course_fee=?,whatsapp_link=? WHERE id=?",name,closes,starts,ends,fee,wa,id);
  return Map.of("message","Batch details updated");
 }
 private static LocalDateTime ts(Object v){return v instanceof java.sql.Timestamp t?t.toLocalDateTime():null;}

 /**
  * Atomic registration switch. All batch rows are locked first, so two concurrent requests are serialised;
  * the previously open batch is closed in the same transaction. A unique index on the generated open_flag column
  * is the final guarantee that two OPEN batches can never exist.
  */
 @Transactional
 public Map<String,Object> setRegistration(Long id,boolean open){
  var locked=jdbc.queryForList("SELECT id,status FROM academy_batches ORDER BY id FOR UPDATE");
  String current=null,closedName=null;
  for(var r:locked)if(((Number)r.get("id")).longValue()==id)current=(String)r.get("status");
  if(current==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Batch not found");
  if("COMPLETED".equals(current))throw new ResponseStatusException(HttpStatus.CONFLICT,"Completed batch is final");
  if(!open){
   jdbc.update("UPDATE academy_batches SET status='CLOSED' WHERE id=? AND status='OPEN'",id);
   return Map.of("message","Registration closed","status","CLOSED");
  }
  var others=jdbc.queryForList("SELECT name FROM academy_batches WHERE status='OPEN' AND id<>?",id);
  if(!others.isEmpty())closedName=String.valueOf(others.get(0).get("name"));
  jdbc.update("UPDATE academy_batches SET status='CLOSED' WHERE status='OPEN' AND id<>?",id);
  jdbc.update("UPDATE academy_batches SET status='OPEN', enrollment_opens_at=? WHERE id=?",LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1),id);
  Map<String,Object> out=new LinkedHashMap<>();
  out.put("message",closedName==null?"Registration opened":"Registration opened. \""+closedName+"\" was closed automatically.");
  out.put("status","OPEN");out.put("closedBatch",closedName);
  return out;
 }
 @Transactional
 public Map<String,Object> status(Long id,String status){
  if(!Set.of("OPEN","CLOSED","COMPLETED").contains(status))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid status");
  if("OPEN".equals(status))return setRegistration(id,true);
  var rows=jdbc.queryForList("SELECT * FROM academy_batches WHERE id=? FOR UPDATE",id);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Batch not found");
  String previous=(String)rows.get(0).get("status");
  if("COMPLETED".equals(previous))throw new ResponseStatusException(HttpStatus.CONFLICT,"Completed batch is final");
  if("COMPLETED".equals(status)&&!"CLOSED".equals(previous))throw new ResponseStatusException(HttpStatus.CONFLICT,"Close registration before completing the batch");
  jdbc.update("UPDATE academy_batches SET status=? WHERE id=?",status,id);
  return Map.of("message","Batch status updated","status",status);
 }
 private java.math.BigDecimal fee(Map<String,String> b){
  try {var v=new java.math.BigDecimal(b.get("courseFee"));if(v.signum()<0||v.compareTo(new java.math.BigDecimal("10000000"))>0)throw new IllegalArgumentException();return v;}
  catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid one-time course fee");}
 }
 /** Only never-used batches can be permanently deleted; foreign keys provide an additional safeguard. */
 @Transactional
 public Map<String,Object> deleteUnused(Long id){
  var rows=jdbc.queryForList("SELECT id,status,next_roll,batch_number FROM academy_batches WHERE id=? FOR UPDATE",id);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Batch not found");
  var row=rows.get(0);
  if(((Number)row.get("batch_number")).intValue()==0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Use Restart Test Batch instead");
  Integer enrolled=jdbc.queryForObject("SELECT COUNT(*) FROM portal_enrollments WHERE batch_id=?",Integer.class,id);
  if((enrolled!=null&&enrolled>0)||((Number)row.get("next_roll")).intValue()>1)
   throw new ResponseStatusException(HttpStatus.CONFLICT,"This batch has student history. It cannot be deleted or its number reused.");
  try{jdbc.update("DELETE FROM academy_batches WHERE id=?",id);}
  catch(org.springframework.dao.DataIntegrityViolationException ex){throw new ResponseStatusException(HttpStatus.CONFLICT,"Batch is referenced by existing records and cannot be deleted.");}
  return Map.of("message","Unused batch deleted. Its number is available again.");
 }
 @Transactional
 public Map<String,Object> restartTest(Long id){
  var batch=jdbc.queryForList("SELECT batch_number FROM academy_batches WHERE id=? FOR UPDATE",id);
  if(batch.isEmpty()||((Number)batch.get(0).get("batch_number")).intValue()!=0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Only Test Batch can be restarted");
  var roster=jdbc.queryForList("SELECT u.id FROM portal_users u JOIN portal_enrollments e ON e.user_id=u.id WHERE e.batch_id=? AND u.role='STUDENT'",Long.class,id);
  for(Long user:roster){
   if(jdbc.queryForObject("SELECT COUNT(*) FROM portal_enrollments WHERE user_id=? AND (batch_id IS NULL OR batch_id<>?)",Integer.class,user,id)>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"A test student has another enrollment; reset stopped");
  }
  if(jdbc.queryForObject("SELECT COUNT(*) FROM razorpay_orders WHERE batch_id=? AND status='PENDING'",Integer.class,id)>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Pending Razorpay orders exist. Resolve them before restarting to avoid losing a payment.");
  jdbc.update("UPDATE razorpay_orders SET user_id=NULL,email_sent=TRUE WHERE batch_id=? AND status='PAID'",id);
  for(Long user:roster){
   jdbc.update("INSERT INTO test_batch_payment_archive(reference_code,provider,status,amount,student_number) SELECT p.reference_code,p.provider,p.status,p.amount,u.student_number FROM portal_payments p JOIN portal_enrollments e ON e.id=p.enrollment_id JOIN portal_users u ON u.id=e.user_id WHERE e.user_id=? AND p.provider LIKE 'OFFLINE_%'",user);
   jdbc.update("DELETE FROM academy_certificate_uploaded_pdfs WHERE certificate_id IN (SELECT c.id FROM academy_certificates c JOIN portal_enrollments e ON e.id=c.enrollment_id WHERE e.user_id=?)",user);
   for(String table:List.of("academy_certificate_manual_drafts","academy_certificate_drafts","academy_certificates","portal_attendance_audit","portal_attendance","portal_payments"))jdbc.update("DELETE FROM "+table+" WHERE enrollment_id IN (SELECT id FROM portal_enrollments WHERE user_id=?)",user);
   jdbc.update("DELETE FROM academy_notifications WHERE user_id=?",user);
   for(String table:List.of("student_password_resets","student_remembered_devices","student_push_devices","admin_recovery_codes","admin_trusted_devices"))jdbc.update("DELETE FROM "+table+" WHERE user_id=?",user);
   jdbc.update("DELETE FROM portal_enrollments WHERE user_id=? AND batch_id=?",user,id);
   jdbc.update("DELETE FROM portal_users WHERE id=? AND role='STUDENT'",user);
  }
  for(String table:List.of("academy_notes","academy_meetings","portal_announcements","academy_notifications"))jdbc.update("DELETE FROM "+table+" WHERE batch_id=?",id);
  jdbc.update("UPDATE academy_batches SET status='CLOSED',next_roll=1,enrollment_closes_at=NULL,classes_start_at=NULL,classes_end_at=NULL,whatsapp_link=NULL WHERE id=?",id);
  return Map.of("message","Test Batch reset. Open registration when ready.");
 }
 public List<Map<String,Object>> students(Long id){
  return jdbc.queryForList("SELECT u.id AS userId,u.full_name AS name,u.email,u.student_number AS studentId,e.id AS enrollmentId,e.status AS enrollmentStatus FROM portal_enrollments e JOIN portal_users u ON u.id=e.user_id WHERE e.batch_id=? ORDER BY u.id",id);
 }
 /** Resolves the user's latest batch enrollment, then issues the ID. Prefer the two-argument form when the batch is known. */
 @Transactional
 public String assignStudentNumber(Long userId){
  var ids=jdbc.queryForList("SELECT batch_id FROM portal_enrollments WHERE user_id=? AND batch_id IS NOT NULL ORDER BY id DESC LIMIT 1",Long.class,userId);
  if(ids.isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"A student ID is issued only after enrollment in a batch");
  return assignStudentNumber(userId,ids.get(0));
 }
 /** HIA + YYYY + BB (batch number) + RRR (roll within the batch). Unique per batch via a locked per-batch counter. */
 @Transactional
 public String assignStudentNumber(Long userId,Long batchId){
  var users=jdbc.queryForList("SELECT student_number FROM portal_users WHERE id=? FOR UPDATE",userId);
  if(users.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  Object existing=users.get(0).get("student_number");if(existing!=null)return existing.toString();
  var batch=jdbc.queryForList("SELECT batch_number,next_roll FROM academy_batches WHERE id=? FOR UPDATE",batchId);
  if(batch.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Batch not found");
  int bb=((Number)batch.get(0).get("batch_number")).intValue(),roll=((Number)batch.get(0).get("next_roll")).intValue();
  String number=String.format("HIA%d%02d%03d",Year.now(ZoneOffset.UTC).getValue(),bb,roll);
  jdbc.update("UPDATE academy_batches SET next_roll=next_roll+1 WHERE id=?",batchId);
  jdbc.update("UPDATE portal_users SET student_number=? WHERE id=? AND student_number IS NULL",number,userId);
  return number;
 }
 public String studentNumber(Long userId){return jdbc.queryForObject("SELECT student_number FROM portal_users WHERE id=?",String.class,userId);}
}
