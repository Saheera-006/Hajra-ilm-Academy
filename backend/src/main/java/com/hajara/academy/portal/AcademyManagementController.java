package com.hajara.academy.portal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@RestController @RequestMapping("/api/portal")
public class AcademyManagementController {
 private final StudentPush push;
 private final AcademyTeacherRepo teachers; private final AcademyLessonRepo lessons;
 private final AcademyCertificateRepo certificates; private final AcademySiteContentRepo content;
 private final AcademyNotificationRepo notifications; private final CourseRepo courses;
 private final PaymentRepo payments; private final BatchService batches; private final org.springframework.jdbc.core.JdbcTemplate jdbc; private final EnrollmentRepo enrollments; private final UserRepo users; private final CurrentUser current; private final AuditLog audit;
 public AcademyManagementController(StudentPush push,AcademyTeacherRepo teachers,AcademyLessonRepo lessons,AcademyCertificateRepo certificates,AcademySiteContentRepo content,AcademyNotificationRepo notifications,CourseRepo courses,EnrollmentRepo enrollments,PaymentRepo payments,UserRepo users,CurrentUser current,AuditLog audit,BatchService batches,org.springframework.jdbc.core.JdbcTemplate jdbc){
 this.push=push;this.teachers=teachers;this.lessons=lessons;this.certificates=certificates;this.content=content;this.notifications=notifications;this.courses=courses;this.enrollments=enrollments;this.payments=payments;this.users=users;this.current=current;this.audit=audit;this.batches=batches;this.jdbc=jdbc; }
 private String required(String s,String label,int max){if(s==null||s.isBlank()||s.length()>max)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,label+" is required (max "+max+")");return s.trim();}
 private void log(Authentication a,HttpServletRequest r,String action,String details){audit.record(current.require(a).id,action,r,details);}
 private void course(Long id){if(id==null||!courses.existsById(id))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid course");}
 private void enrolled(Authentication auth,Long courseId){PortalUser u=current.require(auth); if(!"STUDENT".equals(u.role))throw new ResponseStatusException(HttpStatus.FORBIDDEN); var e=enrollments.findByUserIdAndCourseId(u.id,courseId).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN));if(!"ACTIVE".equals(e.status)||(e.expiresAt!=null&&!e.expiresAt.isAfter(Instant.now())))throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
 @GetMapping("/admin/teachers") public List<AcademyTeacher> teachers(){return teachers.findAll();}
 @PostMapping("/admin/teachers") public AcademyTeacher teacher(Authentication a,HttpServletRequest r,@RequestBody AcademyTeacher x){x.id=null;return saveTeacher(a,r,x);}
 @PutMapping("/admin/teachers/{id}") public AcademyTeacher editTeacher(Authentication a,HttpServletRequest r,@PathVariable Long id,@RequestBody AcademyTeacher x){if(!teachers.existsById(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND);x.id=id;return saveTeacher(a,r,x);}
 private AcademyTeacher saveTeacher(Authentication a,HttpServletRequest r,AcademyTeacher x){x.name=required(x.name,"Name",180);if(x.email!=null&&x.email.length()>254)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);var saved=teachers.save(x);log(a,r,"TEACHER_SAVED","Teacher #"+saved.id);return saved;}
 @GetMapping("/admin/lessons") public List<AcademyLesson> lessons(){return lessons.findAll();}
 @PostMapping("/admin/lessons") public AcademyLesson lesson(Authentication a,HttpServletRequest r,@RequestBody AcademyLesson x){x.id=null;return saveLesson(a,r,x);}
 @PutMapping("/admin/lessons/{id}") public AcademyLesson editLesson(Authentication a,HttpServletRequest r,@PathVariable Long id,@RequestBody AcademyLesson x){if(!lessons.existsById(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND);x.id=id;return saveLesson(a,r,x);}
 private AcademyLesson saveLesson(Authentication a,HttpServletRequest r,AcademyLesson x){if(x.learningArea==null||!Set.of("quran","aqeedah","fiqh","history").contains(x.learningArea))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Select one of the four learning areas");x.courseId=null;x.title=required(x.title,"Title",200);if(x.resourceUrl!=null&&!x.resourceUrl.isBlank()){try{var uri=new java.net.URI(x.resourceUrl);if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||x.resourceUrl.length()>1000)throw new Exception();}catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Use a valid HTTPS resource URL");}}var saved=lessons.save(x);log(a,r,"LESSON_SAVED","Lesson #"+saved.id);return saved;}
 @ResponseStatus(HttpStatus.NO_CONTENT) @DeleteMapping("/admin/lessons/{id}") public void deleteLesson(Authentication a,HttpServletRequest r,@PathVariable Long id){if(!lessons.existsById(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND);lessons.deleteById(id);log(a,r,"LESSON_DELETED","Lesson #"+id);}
 @ResponseStatus(HttpStatus.NO_CONTENT) @DeleteMapping("/admin/notifications/{id}") public void deleteNotification(Authentication a,HttpServletRequest r,@PathVariable Long id){if(!notifications.existsById(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND);notifications.deleteById(id);log(a,r,"NOTIFICATION_DELETED","Notification #"+id);}
 @GetMapping("/learning/{courseId}/lessons") public List<AcademyLesson> studentLessons(Authentication a,@PathVariable Long courseId){enrolled(a,courseId);return lessons.findAll().stream().filter(x->x.published).sorted(Comparator.comparingInt(x->x.positionNumber)).toList();}
 @GetMapping("/admin/certificates") public List<AcademyCertificate> certificates(){return certificates.findAll();}
 @PostMapping("/admin/certificates") public void legacyIssueDisabled(){throw new ResponseStatusException(HttpStatus.CONFLICT,"Use certificate draft, preview and approve workflow");}
 @PostMapping("/admin/batches/{batchId}/certificates/bulk") public void legacyBulkDisabled(){throw new ResponseStatusException(HttpStatus.CONFLICT,"Use batch certificate drafts and approve individually");}
 @GetMapping("/my-certificates") public List<AcademyCertificate> myCertificates(Authentication a){Long uid=current.require(a).id;Set<Long> ids=new HashSet<>();enrollments.findByUserId(uid).forEach(e->ids.add(e.id));return certificates.findAll().stream().filter(c->ids.contains(c.enrollmentId)).toList();}
 @GetMapping("/admin/site-content") public List<AcademySiteContent> siteContent(){return content.findAll();}
 @PutMapping("/admin/site-content/{key}") public AcademySiteContent setContent(Authentication a,HttpServletRequest r,@PathVariable String key,@RequestBody Map<String,String> body){if(!key.matches("[a-zA-Z0-9._-]{1,120}"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);String value=required(body.get("value"),"Content",10000);var c=content.findAll().stream().filter(x->key.equals(x.contentKey)).findFirst().orElseGet(AcademySiteContent::new);c.contentKey=key;c.contentValue=value;var saved=content.save(c);log(a,r,"SITE_CONTENT_UPDATED",key);return saved;}
 @GetMapping("/site-content") public Map<String,String> publicContent(){Map<String,String> result=new HashMap<>();content.findAll().forEach(x->result.put(x.contentKey,x.contentValue));return result;}
 @GetMapping("/admin/notifications") public List<AcademyNotification> notifications(){return notifications.findAll();}
 @PostMapping("/admin/notifications")
 public Map<String,Object> notify(Authentication a, HttpServletRequest r, @RequestBody AcademyNotification x) {
     x.id = null;
     x.title = required(x.title, "Title", 200);
     x.message = required(x.message, "Message", 5000);
     x.userId = null;
     if (x.studentId != null && !x.studentId.isBlank()) {
         if (x.batchId != null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose either a batch or a student.");
         x.studentId = x.studentId.trim().toUpperCase(Locale.ROOT);
         String studentId = x.studentId;
         x.userId = users.findAll().stream()
             .filter(u -> "STUDENT".equals(u.role) && studentId.equals(u.studentNumber))
             .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student ID not found")).id;
     } else {
         x.studentId = null;
         if (x.batchId != null) batches.get(x.batchId);
     }
     x.createdAt = Instant.now();
     var saved = notifications.save(x);
     log(a, r, "NOTIFICATION_PUBLISHED", "Notification #" + saved.id);
     return Map.of("id", saved.id, "push", push.deliver(saved.userId, saved.batchId, saved.title, saved.message));
 }

 @GetMapping("/my-notifications")
 public List<AcademyNotification> myNotifications(Authentication a) {
     Long id = current.require(a).id;
     return notifications.findVisibleTo(id);
 }

 @GetMapping("/admin/reports") public Map<String,Object> reports(){var all=enrollments.findAll();var pay=paymentsForReport();Map<String,Object> out=new LinkedHashMap<>();out.put("students",users.findAll().stream().filter(x->"STUDENT".equals(x.role)).count());out.put("teachers",teachers.count());out.put("lessons",lessons.count());out.put("certificates",certificates.count());out.put("notifications",notifications.count());out.put("enrollments",all.size());out.put("activeEnrollments",all.stream().filter(e->"ACTIVE".equals(e.status)&&(e.expiresAt==null||e.expiresAt.isAfter(Instant.now()))).count());out.put("enrollmentsByCourse",all.stream().collect(java.util.stream.Collectors.groupingBy(e->String.valueOf(e.courseId),java.util.stream.Collectors.counting())));out.put("paymentsByStatus",pay);return out;}
 private Map<String,Long> paymentsForReport(){return payments.findAll().stream().collect(java.util.stream.Collectors.groupingBy(p->p.status==null?"UNKNOWN":p.status,java.util.stream.Collectors.counting()));}
}
