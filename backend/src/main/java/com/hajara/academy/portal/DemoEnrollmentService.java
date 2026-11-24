package com.hajara.academy.portal;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DemoEnrollmentService {
    private final BatchService batches;
    private final UserRepo users;
    private final EnrollmentRepo enrollments;
    private final PaymentRepo payments;

    public DemoEnrollmentService(BatchService batches, UserRepo users,
            EnrollmentRepo enrollments, PaymentRepo payments) {
        this.batches = batches;
        this.users = users;
        this.enrollments = enrollments;
        this.payments = payments;
    }

    @Transactional
    public Map<String, Object> complete(DemoEnrollmentController.Pending pending) {
        var batch = batches.openBatch();
        if (batch.isEmpty() || ((Number)batch.get("id")).longValue() != pending.batchId())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Enrollment window has closed.");
        return completePaid(pending, ((Number)batch.get("course_id")).longValue(), new BigDecimal(batch.get("course_fee").toString()), "DEMO", "DEMO-" + pending.checkoutId());
    }

    @Transactional
    public Map<String,Object> completePaid(DemoEnrollmentController.Pending pending, Long courseId, BigDecimal amount, String provider, String reference) {
        if (users.existsByEmailIgnoreCase(pending.email()) || users.existsByPhone(pending.phone()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with these details already exists.");
        PortalUser user = new PortalUser();
        user.fullName = pending.name();
        user.age = pending.age();
        user.email = pending.email();
        user.emailVerified = true;
        user.phone = pending.phone();
        user.passwordHash = pending.passwordHash();
        user.role = "STUDENT";
        try {
            user = users.saveAndFlush(user);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with these details already exists.");
        }

        PortalEnrollment enrollment = new PortalEnrollment();
        enrollment.userId = user.id;
        enrollment.courseId = courseId;
        enrollment.batchId = pending.batchId();
        enrollment.plan = "COURSE";
        enrollment.renewalMode = "MANUAL";
        enrollment.status = "ACTIVE";
        enrollment.expiresAt = null;
        enrollment = enrollments.saveAndFlush(enrollment);

        PortalPayment payment = new PortalPayment();
        payment.enrollmentId = enrollment.id;
        payment.provider = provider;
        payment.status = "DEMO".equals(provider) ? "SIMULATED" : "PAID";
        payment.amount = amount;
        payment.referenceCode = reference;
        payments.save(payment);
        String studentId = batches.assignStudentNumber(user.id);
        return Map.of("success", true, "demo", "DEMO".equals(provider), "studentId", studentId,
            "message", "DEMO".equals(provider) ? "Demo payment simulated successfully. No real payment received." : "Payment verified. Student account created.");
    }
}
