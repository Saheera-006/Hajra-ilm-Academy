package com.hajara.academy.portal;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
/** Public certificate verification returns minimal information; no student IDs or contact details. */
@RestController @RequestMapping("/api/public/certificates")
public class PublicCertificateVerificationController {
 private final JdbcTemplate jdbc;
 public PublicCertificateVerificationController(JdbcTemplate jdbc){this.jdbc=jdbc;}
 @GetMapping("/{code}") public Map<String,Object> verify(@PathVariable String code){
  if(!code.matches("HIA-[A-Z0-9-]{8,40}"))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  var rows=jdbc.queryForList("SELECT c.certificate_code,c.issued_at,u.full_name FROM academy_certificates c JOIN portal_enrollments e ON e.id=c.enrollment_id JOIN portal_users u ON u.id=e.user_id WHERE c.certificate_code=?",code);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Certificate not found");
  var r=rows.get(0);Map<String,Object> result=new LinkedHashMap<>();
  result.put("valid",true);result.put("certificateCode",r.get("certificate_code"));result.put("studentName",r.get("full_name"));result.put("programme","Islamic Learning Programme");result.put("issuedAt",r.get("issued_at"));return result;
 }
}
