package com.hajara.academy.portal;

import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;

@Service
public class CertificateEmailService {
 private final JdbcTemplate db;
 private final StudentMail mail;
 private final CertificatePdfController pdf;
 private final TransactionTemplate tx;
 public CertificateEmailService(JdbcTemplate db, StudentMail mail, CertificatePdfController pdf, PlatformTransactionManager manager) {
  this.db=db; this.mail=mail; this.pdf=pdf; this.tx=new TransactionTemplate(manager);
  tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
 }
 public void afterIssue(Long id) {
  TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
   @Override public void afterCommit() { try { send(id); } catch(Exception ex) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Certificate email attempt failed for certificate {}",id); } }
  });
 }
 public String send(Long id) {
  return tx.execute(status -> {
   var rows=db.queryForList("SELECT c.certificate_code,u.email,u.full_name FROM academy_certificates c JOIN portal_enrollments e ON e.id=c.enrollment_id JOIN portal_users u ON u.id=e.user_id WHERE c.id=? FOR UPDATE",id);
   if(rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"Certificate not found");
   var row=rows.get(0); boolean sent=false;
   try { sent=mail.certificate((String)row.get("email"),(String)row.get("full_name"),(String)row.get("certificate_code"),pdf.issuedPdf(id).getBody()); }
   catch(Exception ex) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Certificate PDF/email failed for certificate {}",id); }
   String result=sent?"SENT":"FAILED";
   db.update("UPDATE academy_certificates SET email_status=? WHERE id=?",result,id);
   return result;
  });
 }
}
