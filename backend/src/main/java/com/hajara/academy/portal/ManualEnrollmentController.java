package com.hajara.academy.portal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.support.TransactionTemplate;

@RestController
@RequestMapping("/api/portal/admin/students")
public class ManualEnrollmentController {
    private final JdbcTemplate db;
    private final DemoEnrollmentService enrollment;
    private final PasswordEncoder encoder;
    private final StudentMail mail;
    private final TransactionTemplate tx;
    public ManualEnrollmentController(JdbcTemplate db, DemoEnrollmentService enrollment, PasswordEncoder encoder, StudentMail mail, org.springframework.transaction.PlatformTransactionManager manager) {
        this.db=db; this.enrollment=enrollment; this.encoder=encoder; this.mail=mail; this.tx=new TransactionTemplate(manager);
    }
    public record Request(@NotBlank @Size(max=150) String name, @Min(5) @Max(120) int age,
        @NotBlank @Email @Size(max=190) String email, @NotBlank @Size(max=30) String phone,
        @NotNull Long batchId, @NotBlank @Pattern(regexp="CASH|UPI|BANK") String method,
        @NotNull @DecimalMin("0.00") @Digits(integer=10,fraction=2) BigDecimal amount) {}
    @PostMapping("/manual")
    public Map<String,Object> add(@Valid @RequestBody Request r) {
        String email=r.email().trim().toLowerCase(Locale.ROOT);
        String phone=StudentPhone.normalize(r.phone());
        String reference="OFFLINE-"+UUID.randomUUID();
        Map<String,Object> receipt=tx.execute(status -> {
            var rows=db.queryForList("SELECT * FROM academy_batches WHERE id=? FOR UPDATE",r.batchId());
            if(rows.isEmpty() || !Set.of("OPEN","CLOSED","DRAFT").contains(rows.get(0).get("status"))) throw new ResponseStatusException(HttpStatus.CONFLICT,"Select a non-completed batch.");
            var batch=rows.get(0);
            BigDecimal fee=new BigDecimal(batch.get("course_fee").toString());
            if(r.amount().compareTo(fee)!=0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Amount received must equal the batch fee.");
            var pending=new DemoEnrollmentController.Pending(r.name().trim(),r.age(),email,phone,encoder.encode(UUID.randomUUID().toString()+UUID.randomUUID().toString().substring(0,32)),r.batchId(),Instant.now(),reference);
            var result=enrollment.completePaid(pending,((Number)batch.get("course_id")).longValue(),r.amount(),"OFFLINE_"+r.method(),reference);
            var out=new HashMap<String,Object>();
            out.put("student_id",result.get("studentId")); out.put("full_name",r.name().trim()); out.put("email",email);
            out.put("payment_id",reference); out.put("order_id","Not applicable"); out.put("provider","Offline "+r.method());
            out.put("amount_paise",r.amount().movePointRight(2).longValueExact()); out.put("paid_at",Instant.now().toString()); out.put("whatsapp",batch.get("whatsapp_link"));
            return out;
        });
        boolean sent=false;
        try { sent=mail.enrollmentWelcome(email,r.name().trim(),(String)receipt.get("student_id"),(String)receipt.get("whatsapp"),ReceiptPdf.render(receipt),true); }
        catch(Exception ex) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Offline enrollment email failed; reference={}",reference); }
        return Map.of("studentId",receipt.get("student_id"),"welcomeEmailSent",sent,"success",true);
    }
}
