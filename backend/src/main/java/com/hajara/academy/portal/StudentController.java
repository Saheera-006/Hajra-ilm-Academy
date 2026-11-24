package com.hajara.academy.portal;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Endpoints for the logged-in student (and the public course list). */
@RestController
@RequestMapping("/api/portal")
public class StudentController {

    /** Public view of a course. The Google Meet link is deliberately NOT included. */
    public record CourseView(Long id, String title, String description, BigDecimal monthlyPrice, BigDecimal yearlyPrice) {
    }

    public record EnrollmentView(Long id, Long courseId, Long batchId, String course, String plan, String renewalMode, String status,
                                 Instant expiresAt, boolean active, String meetUrl) {
    }

    public record AttendanceView(Long id, LocalDate classDate, String status) {
    }

    public record AnnouncementView(Long id, String title, String body) {
    }

    private final CourseRepo courses;
    private final EnrollmentRepo enrollments;
    private final PaymentRepo payments;
    private final AttendanceRepo attendance;
    private final EnrollmentService enrollmentService;
    private final CurrentUser currentUser;
    private final boolean demoPayments;
    @Value("${RAZORPAY_KEY_ID:}") private String razorpayKey;
    private final BatchService batches;
    private final JdbcTemplate jdbc;

    public StudentController(CourseRepo courses, EnrollmentRepo enrollments, PaymentRepo payments,
            AttendanceRepo attendance, EnrollmentService enrollmentService,
            CurrentUser currentUser, BatchService batches, JdbcTemplate jdbc, @Value("${app.portal.demo-payments:false}") boolean demoPayments) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.payments = payments;
        this.attendance = attendance;
        this.enrollmentService = enrollmentService;
        this.currentUser = currentUser;
        this.demoPayments = demoPayments;
        this.batches = batches;
        this.jdbc = jdbc;
    }

    @GetMapping("/config")
    public Map<String, Object> config() {
        return Map.of("demoPayments", demoPayments && razorpayKey.isBlank());
    }

    @GetMapping("/courses")
    public List<CourseView> courses() {
        return courses.findByActiveTrueOrderByIdAsc().stream()
            .map(c -> new CourseView(c.id, c.title, c.description, c.monthlyPrice, c.yearlyPrice))
            .toList();
    }

    /** Learning-room access is checked on every request against the signed-in user's enrollment. */
    public record LearningRoom(Long courseId, String title, String description, String plan,
                               Instant expiresAt, String meetUrl) {}

    @GetMapping("/learning/{courseId}")
    public LearningRoom learningRoom(Authentication auth, @PathVariable Long courseId) {
        PortalUser user = currentUser.require(auth);
        PortalEnrollment enrollment = enrollments.findByUserIdAndCourseId(user.id, courseId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "An active enrollment is required."));
        if (!"ACTIVE".equals(enrollment.status) || (enrollment.expiresAt != null
                && !enrollment.expiresAt.isAfter(Instant.now()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your course access has expired." );
        }
        PortalCourse course = courses.findById(courseId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found."));
        if (!course.active) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This course is currently unavailable." );
        }
        return new LearningRoom(course.id, course.title, course.description,
            enrollment.plan, enrollment.expiresAt, course.meetUrl);
    }

    /** Only the authenticated student can retrieve the invite for their own active enrollment. */
    @GetMapping("/my-whatsapp-group")
    public Map<String, Object> myWhatsappGroup(Authentication auth) {
        PortalUser u = currentUser.require(auth);
        var rows = jdbc.queryForList("""
            SELECT b.whatsapp_link FROM portal_enrollments e
            JOIN academy_batches b ON b.id=e.batch_id
            WHERE e.user_id=? AND e.status='ACTIVE'
              AND (e.expires_at IS NULL OR e.expires_at>UTC_TIMESTAMP(6))
            ORDER BY e.id DESC LIMIT 1
            """, u.id);
        if (rows.isEmpty()) return Map.of("available", false);
        Object raw = rows.get(0).get("whatsapp_link");
        if (!(raw instanceof String url) || url.isBlank()) return Map.of("available", false);
        // Validate the stored value as well, in case older records predate validation.
        if (!url.matches("https://chat\\.whatsapp\\.com/[A-Za-z0-9]+")) return Map.of("available", false);
        return Map.of("available", true, "inviteUrl", url);
    }

    @GetMapping("/my-enrollments")
    public List<EnrollmentView> myEnrollments(Authentication auth) {
        PortalUser u = currentUser.require(auth);
        List<PortalEnrollment> mine = enrollments.findByUserId(u.id);
        Map<Long, PortalCourse> byId = courses.findAllById(
                mine.stream().map(e -> e.courseId).collect(Collectors.toSet()))
            .stream().collect(Collectors.toMap(c -> c.id, c -> c));
        Instant now = Instant.now();
        return mine.stream().map(e -> {
            PortalCourse course = byId.get(e.courseId);
            boolean active = "ACTIVE".equals(e.status) && (e.expiresAt == null || e.expiresAt.isAfter(now));
            return new EnrollmentView(e.id, e.courseId, e.batchId, course == null ? "Course" : course.title, e.plan, e.renewalMode,
                e.status, e.expiresAt, active, active && course != null ? course.meetUrl : null);
        }).toList();
    }

    /** Simulated payment, only when DEMO_PAYMENTS=true. Collects no money. */
    @PostMapping("/demo-checkout")
    @Transactional
    public Map<String, Object> demoCheckout(Authentication auth, @Valid @RequestBody PortalDtos.Checkout r) {
        if (!demoPayments || !razorpayKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Demo checkout is disabled.");
        }
        PortalUser u = currentUser.require(auth);
        PortalCourse course = courses.findById(r.courseId()).filter(c -> c.active)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found."));
        var batch = batches.requireOpen(course.id);
        if (enrollments.findByUserIdAndCourseId(u.id,course.id).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT,"You already have an enrollment for this course.");
        PortalEnrollment e = enrollmentService.activate(u.id, course.id, r.plan(), r.renewalMode());
        e.batchId = ((Number)batch.get("id")).longValue();
        e.expiresAt = BatchService.endInstant(batch);
        enrollments.save(e);
        String studentNumber = batches.assignStudentNumber(u.id, ((Number)batch.get("id")).longValue());

        PortalPayment payment = new PortalPayment();
        payment.enrollmentId = e.id;
        payment.provider = "DEMO";
        payment.status = "SIMULATED";
        payment.amount = new java.math.BigDecimal(batch.get("course_fee").toString());
        payment.referenceCode = java.util.UUID.randomUUID().toString();
        payments.save(payment);

        Map<String, Object> body = new HashMap<>();
        body.put("message", "SIMULATED payment: demo enrollment activated, no money collected.");
        body.put("expiresAt", e.expiresAt.toString());
        body.put("studentId", studentNumber);
        body.put("batchId", e.batchId);
        return body;
    }

    @PutMapping("/my-enrollments/{id}/renewal")
    public Map<String, String> renewal(Authentication auth, @PathVariable Long id,
            @Valid @RequestBody PortalDtos.Renewal r) {
        PortalUser u = currentUser.require(auth);
        PortalEnrollment e = enrollments.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrollment not found."));
        if (!e.userId.equals(u.id)) {
            // Same answer as "not found" so ids of other students cannot be probed.
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrollment not found.");
        }
        e.renewalMode = r.renewalMode();
        enrollments.save(e);
        return Map.of("message", "Preference saved. Automatic billing is NOT connected.");
    }

    @GetMapping("/announcements")
    public List<AnnouncementView> announcements(Authentication auth) {
        Long id = currentUser.require(auth).id;
        return jdbc.query("""
            SELECT a.id, a.title, a.body FROM portal_announcements a
            WHERE a.batch_id IS NULL OR EXISTS (
                SELECT 1 FROM portal_enrollments e WHERE e.user_id=? AND e.batch_id=a.batch_id
                AND e.status='ACTIVE' AND (e.expires_at IS NULL OR e.expires_at>UTC_TIMESTAMP(6))
            )
            ORDER BY a.id DESC LIMIT 50
            """, (rs, row) -> new AnnouncementView(rs.getLong("id"), rs.getString("title"), rs.getString("body")), id);
    }

    @GetMapping("/my-attendance")
    public List<AttendanceView> myAttendance(Authentication auth) {
        PortalUser u = currentUser.require(auth);
        List<Long> ids = enrollments.findByUserId(u.id).stream().map(e -> e.id).toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        return attendance.findByEnrollmentIdInOrderByClassDateDesc(ids).stream()
            .map(a -> new AttendanceView(a.id, a.classDate, a.status))
            .toList();
    }
}
