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
        enrollment.courseId = ((Number)batch.get("course_id")).longValue();
        enrollment.batchId = pending.batchId();
        enrollment.plan = "COURSE";
        enrollment.renewalMode = "MANUAL";
        enrollment.status = "ACTIVE";
        enrollment.expiresAt = null;
        enrollment = enrollments.saveAndFlush(enrollment);

        PortalPayment payment = new PortalPayment();
        payment.enrollmentId = enrollment.id;
        payment.provider = "DEMO";
        payment.status = "SIMULATED";
        payment.amount = (BigDecimal) batch.get("course_fee");
        payment.referenceCode = "DEMO-" + pending.checkoutId();
        payments.save(payment);
        String studentId = batches.assignStudentNumber(user.id);
        return Map.of("success", true, "demo", true, "studentId", studentId,
            "message", "Demo payment simulated successfully. Student account created. No real payment received.");
    }
}
