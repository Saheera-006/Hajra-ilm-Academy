package com.hajara.academy.portal;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@RestController
@RequestMapping("/api/portal/admin/certificates")
public class CertificateEmailController {
 private final CurrentUser current;
 private final CertificateEmailService email;
 public CertificateEmailController(CurrentUser current,CertificateEmailService email){this.current=current;this.email=email;}
 @PostMapping("/{id}/resend-email") public Map<String,String> resend(Authentication auth,@PathVariable Long id){
  if(!"ADMIN".equals(current.require(auth).role))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  return Map.of("emailStatus",email.send(id));
 }
}
