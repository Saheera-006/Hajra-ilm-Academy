package com.hajara.academy.portal;
import java.util.*;
import java.io.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;

@RestController
public class RazorpayController {
 private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(RazorpayController.class);
 final RazorpayService service; final DemoEnrollmentController registration; final StudentMail mail; final CurrentUser users;
 RazorpayController(RazorpayService service,DemoEnrollmentController registration,StudentMail mail,CurrentUser users){this.service=service;this.registration=registration;this.mail=mail;this.users=users;}
 record Order(String checkoutId,String address,String gstin){}
 record Verify(String orderId,String paymentId,String signature){}
 @PostMapping("/api/portal/auth/razorpay/order")
 public Map<String,Object> order(@RequestBody Order r,HttpSession session){synchronized(session){return service.order(registration.verifiedPending(session,r.checkoutId()));}}
 @PostMapping("/api/portal/auth/razorpay/verify")
 public Map<String,Object> verify(@RequestBody Verify r){
  if(!service.verifyCheckoutSignature(r.orderId(),r.paymentId(),r.signature())){log.warn("Razorpay checkout signature rejected; order={}, payment={}",safeRef(r.orderId()),safeRef(r.paymentId()));throw RazorpayService.bad("Invalid payment signature.");}
  var result=new HashMap<>(service.capture(r.orderId(),r.paymentId()));result.put("welcomeEmailSent",send(r.orderId()));return result;
 }
 static String safeRef(String s){return s!=null&&s.matches("(order|pay)_[A-Za-z0-9]{1,70}")?s:"invalid";}
 record Recover(String paymentId){}
 @PostMapping("/api/portal/admin/razorpay/{order}/recover")
 public Map<String,Object> recover(@PathVariable String order,@RequestBody Recover r){var result=new HashMap<>(service.capture(order,r.paymentId()));result.put("welcomeEmailSent",send(order));return result;}
 @PostMapping("/api/payments/razorpay/webhook")
 public Map<String,Object> webhook(@RequestBody byte[] body,@RequestHeader(value="X-Razorpay-Signature",required=false) String sig) throws Exception {
  if(!service.verifyWebhookSignature(body,sig)){log.warn("Razorpay webhook signature rejected");throw RazorpayService.bad("Invalid webhook signature.");}
  var event=service.getJson().readTree(body);String type=event.path("event").asText();
  if("payment.captured".equals(type)||"order.paid".equals(type)||"refund.processed".equals(type)){
   String payment=event.path("payload").path("payment").path("entity").path("id").asText();
   if(payment.isBlank())payment=event.path("payload").path("refund").path("entity").path("payment_id").asText();
   if(!payment.matches("pay_[A-Za-z0-9]+"))throw RazorpayService.bad("Invalid payment ID.");
   String order=service.api("payments/"+payment,null).path("order_id").asText();
   if(!service.getDb().queryForList("SELECT order_id FROM razorpay_orders WHERE order_id=?",order).isEmpty()){service.capture(order,payment);send(order);}
  }return Map.of("ok",true);
 }
 synchronized boolean send(String order){var r=service.getDb().queryForMap("SELECT * FROM razorpay_orders WHERE order_id=?",order);if(Boolean.TRUE.equals(r.get("email_sent"))||"1".equals(String.valueOf(r.get("email_sent"))))return true;try{boolean ok=mail.receipt((String)r.get("email"),(String)r.get("payment_id"),pdf(r));if(ok)service.getDb().update("UPDATE razorpay_orders SET email_sent=TRUE WHERE order_id=?",order);return ok;}catch(Exception e){return false;}}
 static String money(Object n){return n==null?"Pending":java.math.BigDecimal.valueOf(((Number)n).longValue(),2).toPlainString();}
 static byte[] pdf(Map<String,Object> r)throws IOException{return ReceiptPdf.render(r);}
 static final String FIELDS="order_id,payment_id,full_name,email,billing_address,gstin,status,amount_paise,fee_paise,tax_paise,refunded_paise,student_id,email_sent,created_at,paid_at";
 @GetMapping("/api/portal/admin/razorpay") public List<Map<String,Object>> admin(){return service.getDb().queryForList("SELECT "+FIELDS+" FROM razorpay_orders ORDER BY created_at DESC LIMIT 1000");}
 @PostMapping("/api/portal/admin/razorpay/{order}/retry") public Map<String,Object> retry(@PathVariable String order){var r=service.getDb().queryForMap("SELECT * FROM razorpay_orders WHERE order_id=?",order);if(r.get("payment_id")==null)throw RazorpayService.bad("Payment not verified.");return Map.of("sent",send(order));}
 @GetMapping("/api/portal/my-payments") public List<Map<String,Object>> mine(Authentication auth){return service.getDb().queryForList("SELECT "+FIELDS+" FROM razorpay_orders WHERE user_id=? AND status='PAID' ORDER BY paid_at DESC",users.require(auth).id);}
 @GetMapping("/api/portal/my-payments/{order}/receipt") public ResponseEntity<byte[]> receipt(@PathVariable String order,Authentication auth)throws IOException{var rows=service.getDb().queryForList("SELECT * FROM razorpay_orders WHERE order_id=? AND user_id=? AND status='PAID'",order,users.require(auth).id);if(rows.isEmpty())return ResponseEntity.notFound().build();return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header("Content-Disposition","inline; filename=receipt.pdf").body(pdf(rows.get(0)));}
}
