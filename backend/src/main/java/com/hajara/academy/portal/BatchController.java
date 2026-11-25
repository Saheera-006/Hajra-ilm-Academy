package com.hajara.academy.portal;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import jakarta.servlet.http.HttpServletRequest;
@RestController @RequestMapping("/api/portal")
public class BatchController {
 private final BatchService batches;private final CurrentUser current;private final AuditLog audit;
 public BatchController(BatchService b,CurrentUser c,AuditLog a){batches=b;current=c;audit=a;}
 @GetMapping("/batches/current") public Map<String,Object> current(){return batches.openBatch();}
 @GetMapping("/my-student-id") public Map<String,Object> studentId(Authentication auth){String n=batches.studentNumber(current.require(auth).id);return Collections.singletonMap("studentId",n);}
 @GetMapping("/admin/batches") public List<Map<String,Object>> list(){return batches.list();}
 @PostMapping("/admin/batches") public Map<String,Object> create(Authentication auth,HttpServletRequest req,@RequestBody Map<String,String> body){var result=batches.create(body);audit.record(current.require(auth).id,"BATCH_CREATED",req,body.getOrDefault("name",""));return result;}
 @PutMapping("/admin/batches/{id}") public Map<String,Object> update(Authentication auth,HttpServletRequest req,@PathVariable Long id,@RequestBody Map<String,String> body){var result=batches.update(id,body);audit.record(current.require(auth).id,"BATCH_SCHEDULE_UPDATED",req,"Batch #"+id);return result;}
 @PutMapping("/admin/batches/{id}/status") public Map<String,Object> status(Authentication auth,HttpServletRequest req,@PathVariable Long id,@RequestBody Map<String,String> body){var result=batches.status(id,body.get("status"));audit.record(current.require(auth).id,"BATCH_STATUS",req,"Batch #"+id+" -> "+body.get("status"));return result;}
 @DeleteMapping("/admin/batches/{id}") public Map<String,Object> delete(Authentication auth,HttpServletRequest req,@PathVariable Long id){var result=batches.deleteUnused(id);audit.record(current.require(auth).id,"BATCH_DELETED",req,"Unused batch #"+id);return result;}
 @GetMapping("/admin/batches/{id}/students") public List<Map<String,Object>> students(@PathVariable Long id){return batches.students(id);}
}
