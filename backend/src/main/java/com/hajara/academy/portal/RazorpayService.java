package com.hajara.academy.portal;

import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.math.BigDecimal;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.*;

@Service
public class RazorpayService {
 private final JdbcTemplate db; final BatchService batches; final DemoEnrollmentService enrollment;
 private final ObjectMapper json = new ObjectMapper();
 final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
 @Value("${RAZORPAY_KEY_ID:}") String key;
 @Value("${RAZORPAY_KEY_SECRET:}") private String secret;
 @Value("${RAZORPAY_WEBHOOK_SECRET:}") private String webhookSecret;
 RazorpayService(JdbcTemplate db, BatchService batches, DemoEnrollmentService enrollment){this.db=db;this.batches=batches;this.enrollment=enrollment;}
 static ResponseStatusException bad(String s){return new ResponseStatusException(HttpStatus.BAD_REQUEST,s);}
 static boolean signature(String secret, byte[] body, String supplied){
  if(secret==null||secret.isBlank()||supplied==null)return false;
  try {Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));return java.security.MessageDigest.isEqual(HexFormat.of().formatHex(mac.doFinal(body)).getBytes(StandardCharsets.US_ASCII),supplied.getBytes(StandardCharsets.US_ASCII));}catch(Exception e){return false;}
 }
 public JsonNode api(String path, Object body){
  if(key.isBlank()||secret.isBlank())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Payment gateway not configured.");
  try {var b=HttpRequest.newBuilder(URI.create("https://api.razorpay.com/v1/"+path)).timeout(Duration.ofSeconds(20)).header("Authorization","Basic "+Base64.getEncoder().encodeToString((key+":"+secret).getBytes(StandardCharsets.UTF_8))).header("Content-Type","application/json");
   var r=http.send(body==null?b.GET().build():b.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
   if(r.statusCode()/100!=2)throw new IllegalStateException();return json.readTree(r.body());
  }catch(InterruptedException e){Thread.currentThread().interrupt();throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Gateway interrupted.");}catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Payment gateway unavailable. Check payment status before retrying.");}
 }
 @Transactional
 public Map<String,Object> order(DemoEnrollmentController.Pending p,String address,String gstin){
  if(address==null||address.isBlank()||address.length()>500||gstin==null||gstin.length()>20)throw bad("Enter valid billing details.");
  var existing=db.queryForList("SELECT * FROM razorpay_orders WHERE checkout_id=?",p.checkoutId());
  if(!existing.isEmpty())return checkout(existing.get(0));
  var b=batches.openBatch();if(b.isEmpty()||((Number)b.get("id")).longValue()!=p.batchId())throw bad("Enrollment closed.");
  long amount=new BigDecimal(b.get("course_fee").toString()).movePointRight(2).longValueExact();if(amount<100)throw bad("Minimum payment is INR 1.");
  var o=api("orders",Map.of("amount",amount,"currency","INR","receipt",p.checkoutId()));
  String id=o.path("id").asText();if(!id.startsWith("order_"))throw bad("Invalid gateway order.");
  db.update("INSERT INTO razorpay_orders(checkout_id,order_id,full_name,age,email,phone,password_hash,batch_id,course_id,amount_paise,billing_address,gstin) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",p.checkoutId(),id,p.name(),p.age(),p.email(),p.phone(),p.passwordHash(),p.batchId(),b.get("course_id"),amount,address.trim(),gstin.trim());
  return checkout(db.queryForMap("SELECT * FROM razorpay_orders WHERE checkout_id=?",p.checkoutId()));
 }
 Map<String,Object> checkout(Map<String,Object> r){return Map.of("key",key,"orderId",r.get("order_id"),"amount",r.get("amount_paise"),"email",r.get("email"),"name",r.get("full_name"),"phone",r.get("phone"));}
 @Transactional
 public Map<String,Object> capture(String order,String payment){
  if(order==null||payment==null||!order.matches("order_[A-Za-z0-9]+")||!payment.matches("pay_[A-Za-z0-9]+"))throw bad("Invalid payment reference.");
  var rows=db.queryForList("SELECT * FROM razorpay_orders WHERE order_id=? FOR UPDATE",order);if(rows.isEmpty())throw bad("Unknown order.");var r=rows.get(0);
  var p=api("payments/"+payment,null);
  if(!order.equals(p.path("order_id").asText())||!payment.equals(p.path("id").asText())||!"INR".equals(p.path("currency").asText())||p.path("amount").asLong()!=((Number)r.get("amount_paise")).longValue())throw bad("Payment mismatch.");
  if(!"captured".equals(p.path("status").asText())&&!"refunded".equals(p.path("status").asText()))throw bad("Payment not captured yet.");
  Long fee=p.path("fee").isNumber()?p.path("fee").asLong():null;Long tax=p.path("tax").isNumber()?p.path("tax").asLong():null;long refunded=p.path("amount_refunded").asLong();
  if(r.get("student_id")!=null){if(!payment.equals(r.get("payment_id")))throw bad("Different payment for completed order.");db.update("UPDATE razorpay_orders SET fee_paise=?,tax_paise=?,refunded_paise=? WHERE order_id=?",fee,tax,refunded,order);return result(r);}
  if(refunded>0)throw bad("Refunded payment requires administrator review.");
  var pending=new DemoEnrollmentController.Pending((String)r.get("full_name"),((Number)r.get("age")).intValue(),(String)r.get("email"),(String)r.get("phone"),(String)r.get("password_hash"),((Number)r.get("batch_id")).longValue(),Instant.now(),(String)r.get("checkout_id"));
  var done=enrollment.completePaid(pending,((Number)r.get("course_id")).longValue(),BigDecimal.valueOf(((Number)r.get("amount_paise")).longValue(),2),"RAZORPAY",payment);
  db.update("UPDATE razorpay_orders SET payment_id=?,status='PAID',fee_paise=?,tax_paise=?,student_id=?,user_id=(SELECT id FROM portal_users WHERE email=?),paid_at=CURRENT_TIMESTAMP,password_hash=NULL WHERE order_id=?",payment,fee,tax,done.get("studentId"),r.get("email"),order);
  return result(db.queryForMap("SELECT * FROM razorpay_orders WHERE order_id=?",order));
 }
 Map<String,Object> result(Map<String,Object> r){return Map.of("success",true,"studentId",r.get("student_id"),"message","Payment verified. Student account created. Receipt email will be sent.");}
 public JdbcTemplate getDb(){return db;}
 public ObjectMapper getJson(){return json;}
 public boolean verifyCheckoutSignature(String orderId,String paymentId,String supplied){
  if(orderId==null||paymentId==null||!orderId.matches("order_[A-Za-z0-9]+")||!paymentId.matches("pay_[A-Za-z0-9]+"))return false;
  return signature(secret,(orderId+"|"+paymentId).getBytes(StandardCharsets.UTF_8),supplied);
 }
 public boolean verifyWebhookSignature(byte[] body,String supplied){return signature(webhookSecret,body,supplied);}
}
