package com.hajara.academy.portal;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Administrator-only endpoints. SecurityConfig requires ROLE_ADMIN for everything under /api/portal/admin. */
@RestController
@RequestMapping("/api/portal/admin")
public class AdminController {

    public record StudentView(Long id, String name, String email, String phone, int age, String studentId) {
    }

    public record AdminCourseView(Long id, String title, String description, BigDecimal monthlyPrice,
                                  BigDecimal yearlyPrice, String meetUrl, boolean active) {
    }

    public record AdminEnrollmentView(Long id, Long userId, String student, Long courseId, String course,
                                      Long batchId, String plan, String renewalMode, String status, Instant expiresAt) {
    }

    private final UserRepo users;
    private final CourseRepo courses;
    private final EnrollmentRepo enrollments;
    private final PaymentRepo payments;
    private final AnnouncementRepo announcements;
    private final AttendanceRepo attendance;
    private final EnrollmentService enrollmentService;
    private final CurrentUser currentUser;
    private final AuditLog audit;
    private final JdbcTemplate jdbc;
    private final BatchService batches;

    public AdminController(UserRepo users, CourseRepo courses, EnrollmentRepo enrollments, PaymentRepo payments,
            AnnouncementRepo announcements, AttendanceRepo attendance, EnrollmentService enrollmentService,
            CurrentUser currentUser, AuditLog audit, JdbcTemplate jdbc, BatchService batches) {
        this.users = users;
        this.courses = courses;
        this.enrollments = enrollments;
        this.payments = payments;
        this.announcements = announcements;
        this.attendance = attendance;
        this.enrollmentService = enrollmentService;
        this.currentUser = currentUser;
        this.audit = audit;
        this.jdbc = jdbc;
        this.batches = batches;
    }

    // ------------------------------------------------------------------ read

    @GetMapping("/students")
    public List<StudentView> students() {
        return users.findAll().stream()
            .filter(u -> "STUDENT".equals(u.role))
            .map(u -> new StudentView(u.id, u.fullName, u.email, u.phone, u.age, u.studentNumber))
            .toList();
    }

    /** Permanently remove a STUDENT and records belonging to their enrollments.
     *  All operations share one transaction; a failure rolls back the deletion.
     *  Administrators cannot be deleted using this endpoint.
     */
    @DeleteMapping("/students/{id}")
    @Transactional
    public Map<String, String> permanentlyDeleteStudent(Authentication auth, HttpServletRequest request,
            @PathVariable Long id) {
        PortalUser target = users.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
        if (!"STUDENT".equals(target.role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only student accounts can be deleted");
        }
        // Remove enrollment children before their parents; never disable foreign-key checks.
        jdbc.update("DELETE c FROM academy_certificates c JOIN portal_enrollments e ON c.enrollment_id=e.id WHERE e.user_id=?", id);
        jdbc.update("DELETE a FROM portal_attendance a JOIN portal_enrollments e ON a.enrollment_id=e.id WHERE e.user_id=?", id);
        jdbc.update("DELETE p FROM portal_payments p JOIN portal_enrollments e ON p.enrollment_id=e.id WHERE e.user_id=?", id);
        jdbc.update("DELETE FROM portal_enrollments WHERE user_id=?", id);
        jdbc.update("DELETE FROM academy_notifications WHERE user_id=?", id);
        jdbc.update("DELETE FROM admin_recovery_codes WHERE user_id=?", id);
        // Restrict the final statement to STUDENT as defense in depth.
        int deleted = jdbc.update("DELETE FROM portal_users WHERE id=? AND role='STUDENT'", id);
        if (deleted != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Student deletion could not be completed");
        audit.record(currentUser.require(auth).id, "ADMIN_STUDENT_PERMANENT_DELETE", request,
            "Deleted student #" + id + " and related enrollment records");
        return Map.of("message", "Student and associated records permanently deleted.");
    }

    @GetMapping("/courses")
    public List<AdminCourseView> allCourses() {
        return courses.findAll().stream().map(AdminController::toView).toList();
    }

    @GetMapping("/enrollments")
    public List<AdminEnrollmentView> allEnrollments() {
        Map<Long, PortalUser> userById = users.findAll().stream().collect(Collectors.toMap(u -> u.id, Function.identity()));
        Map<Long, PortalCourse> courseById = courses.findAll().stream().collect(Collectors.toMap(c -> c.id, Function.identity()));
        return enrollments.findAll().stream().map(e -> {
            PortalUser u = userById.get(e.userId);
            PortalCourse c = courseById.get(e.courseId);
            return new AdminEnrollmentView(e.id, e.userId, u == null ? "Unknown" : u.fullName, e.courseId,
                c == null ? "Unknown" : c.title, e.batchId, e.plan, e.renewalMode, e.status, e.expiresAt);
        }).toList();
    }

    @GetMapping("/payments")
    public List<PortalPayment> allPayments() {
        return payments.findAll();
    }

    @GetMapping("/security/audit")
    public List<Map<String, Object>> auditLog() {
        return audit.latest();
    }

    /** Server-side reporting, with no changes to financial or access records. */
    @GetMapping("/overview")
    public Map<String, Object> overview() {
        var studentCount = users.findAll().stream().filter(u -> "STUDENT".equals(u.role)).count();
        var allEnrollments = enrollments.findAll();
        var activeCount = allEnrollments.stream().filter(e -> "ACTIVE".equals(e.status)
            && e.expiresAt != null && e.expiresAt.isAfter(Instant.now())).count();
        var paid = payments.findAll().stream().filter(p -> "SUCCESS".equals(p.status) || "PAID".equals(p.status))
            .map(p -> p.amount == null ? BigDecimal.ZERO : p.amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return Map.of("students", studentCount, "courses", courses.count(), "activeEnrollments", activeCount,
            "totalEnrollments", allEnrollments.size(), "payments", payments.count(), "recordedPaidAmount", paid);
    }

    @GetMapping("/attendance")
    public List<PortalAttendance> attendanceRecords() {
        return attendance.findAll();
    }

    @PutMapping("/courses/{id}/status")
    public AdminCourseView setCourseStatus(Authentication auth, HttpServletRequest request, @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        if (!body.containsKey("active") || body.get("active") == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "active is required");
        PortalCourse course = courses.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found"));
        course.active = body.get("active");
        var saved = courses.save(course);
        audit.record(currentUser.require(auth).id, "ADMIN_COURSE_STATUS", request,
            "Course #" + id + " active=" + saved.active);
        return toView(saved);
    }

    @PutMapping("/enrollments/{id}/status")
    public Map<String, String> setEnrollmentStatus(Authentication auth, HttpServletRequest request, @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (!"ACTIVE".equals(status) && !"CANCELLED".equals(status))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be ACTIVE or CANCELLED");
        PortalEnrollment enrollment = enrollments.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrollment not found"));
        if ("ACTIVE".equals(status) && (enrollment.expiresAt == null || !enrollment.expiresAt.isAfter(Instant.now())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expired access cannot be reactivated; grant a new term instead");
        enrollment.status = status;
        enrollments.save(enrollment);
        audit.record(currentUser.require(auth).id, "ADMIN_ENROLLMENT_STATUS", request,
            "Enrollment #" + id + " status=" + status);
        return Map.of("message", "Enrollment updated");
    }

    // ------------------------------------------------------------------ courses

    @PostMapping("/courses")
    public AdminCourseView addCourse(Authentication auth, HttpServletRequest request,
            @Valid @RequestBody PortalDtos.CourseEdit r) {
        PortalCourse saved = saveCourse(new PortalCourse(), r);
        audit.record(currentUser.require(auth).id, "ADMIN_COURSE_CREATED", request, "Course #" + saved.id);
        return toView(saved);
    }

    @PutMapping("/courses/{id}")
    public AdminCourseView editCourse(Authentication auth, HttpServletRequest request, @PathVariable Long id,
            @Valid @RequestBody PortalDtos.CourseEdit r) {
        PortalCourse existing = courses.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found."));
        PortalCourse saved = saveCourse(existing, r);
        audit.record(currentUser.require(auth).id, "ADMIN_COURSE_UPDATED", request, "Course #" + saved.id);
        return toView(saved);
    }

    private PortalCourse saveCourse(PortalCourse c, PortalDtos.CourseEdit r) {
        c.title = r.title().trim();
        c.description = r.description();
        c.monthlyPrice = r.monthlyPrice();
        c.yearlyPrice = r.yearlyPrice();
        c.meetUrl = normalizeMeetUrl(r.meetUrl());
        return courses.save(c);
    }

    /** Accepts only real https://meet.google.com/... links (host is checked, not just the prefix). */
    private static String normalizeMeetUrl(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim();
        URI uri;
        try {
            uri = new URI(value);
        } catch (java.net.URISyntaxException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid Google Meet link.");
        }
        boolean valid = "https".equalsIgnoreCase(uri.getScheme())
            && uri.getHost() != null
            && "meet.google.com".equals(uri.getHost().toLowerCase(Locale.ROOT))
            && uri.getUserInfo() == null
            && uri.getPort() == -1;
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only https://meet.google.com/ links are allowed.");
        }
        return value;
    }

    private static AdminCourseView toView(PortalCourse c) {
        return new AdminCourseView(c.id, c.title, c.description, c.monthlyPrice, c.yearlyPrice, c.meetUrl, c.active);
    }

    // ------------------------------------------------------------------ announcements

    @GetMapping("/announcements")
    public List<PortalAnnouncement> listAnnouncements() {
        return announcements.findAll(org.springframework.data.domain.Sort.by("id").descending());
    }

    @PostMapping("/announcements")
    public Map<String, Object> addAnnouncement(Authentication auth, HttpServletRequest request,
            @Valid @RequestBody PortalDtos.AnnouncementEdit r) {
        PortalAnnouncement a = new PortalAnnouncement();
        a.title = r.title().trim();
        a.body = r.body().trim();
        if (r.batchId() != null) batches.get(r.batchId());
        a.batchId = r.batchId();
        PortalAnnouncement saved = announcements.save(a);
        audit.record(currentUser.require(auth).id, "ADMIN_ANNOUNCEMENT_CREATED", request, "Announcement #" + saved.id);
        Map<String, Object> body = new HashMap<>();
        body.put("id", saved.id);
        return body;
    }

    @DeleteMapping("/announcements/{id}")
    public Map<String, String> deleteAnnouncement(Authentication auth, HttpServletRequest request, @PathVariable Long id) {
        if (!announcements.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found.");
        }
        announcements.deleteById(id);
        audit.record(currentUser.require(auth).id, "ADMIN_ANNOUNCEMENT_DELETED", request, "Announcement #" + id);
        return Map.of("message", "Deleted");
    }

    // ------------------------------------------------------------------ attendance and access

    @PostMapping("/attendance")
    @Transactional
    public Map<String, String> markAttendance(Authentication auth, HttpServletRequest request,
            @Valid @RequestBody PortalDtos.AttendanceEdit r) {
        if (!enrollments.existsById(r.enrollmentId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrollment not found.");
        }
        PortalAttendance a = attendance.findByEnrollmentIdAndClassDate(r.enrollmentId(), r.date())
            .orElseGet(PortalAttendance::new);
        a.enrollmentId = r.enrollmentId();
        a.classDate = r.date();
        a.status = r.status();
        attendance.save(a);
        audit.record(currentUser.require(auth).id, "ADMIN_ATTENDANCE_MARKED", request,
            "Enrollment #" + r.enrollmentId() + " " + r.date() + " " + r.status());
        return Map.of("message", "Saved");
    }

    /** Assign an existing legacy enrollment to a batch without creating a duplicate. */
    @PutMapping("/enrollments/{id}/batch")
    @Transactional
    public Map<String, Object> assignExistingBatch(Authentication auth, HttpServletRequest request,
            @PathVariable Long id, @RequestBody Map<String, Long> body) {
        Long batchId = body.get("batchId");
        if (batchId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Batch is required.");
        PortalEnrollment enrollment = enrollments.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrollment not found."));
        PortalUser student = users.findById(enrollment.userId)
            .filter(u -> "STUDENT".equals(u.role))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found."));
        if (enrollment.batchId != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Enrollment already has a batch; reassignment requires separate review.");
        }
        var batch = batches.requireManualBatch(batchId);
        Long courseId = ((Number) batch.get("course_id")).longValue();
        if (!courseId.equals(enrollment.courseId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Batch belongs to a different course.");
        }
        enrollment.batchId = ((Number) batch.get("id")).longValue();
        enrollment.expiresAt = BatchService.endInstant(batch);
        enrollments.save(enrollment);
        batches.assignStudentNumber(student.id, batchId);
        audit.record(currentUser.require(auth).id, "ADMIN_ENROLLMENT_BATCH_ASSIGNED", request,
            "Enrollment #" + id + " assigned to batch #" + batchId);
        return Map.of("message", "Batch assigned to existing enrollment.", "enrollmentId", id, "batchId", batchId);
    }

    /** Manually activates (or extends) a student's access, e.g. after an offline payment. */
    @PostMapping("/enrollments")
    public Map<String, Object> grantAccess(Authentication auth, HttpServletRequest request,
            @Valid @RequestBody PortalDtos.GrantAccess r) {
        PortalUser student = users.findById(r.userId())
            .filter(u -> "STUDENT".equals(u.role))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found."));
        PortalCourse course = courses.findById(((Number)batches.requireManualBatch(r.batchId()).get("course_id")).longValue()).filter(c -> c.active)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found."));
        var batch = batches.requireManualBatch(r.batchId());
        if (!course.id.equals(((Number)batch.get("course_id")).longValue())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Batch course mismatch");
        if (enrollments.findByUserIdAndCourseId(student.id,course.id).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Student already enrolled in this course");
        PortalEnrollment e = enrollmentService.activate(student.id, course.id, "COURSE", "MANUAL");
        e.batchId = ((Number)batch.get("id")).longValue();
        e.expiresAt = BatchService.endInstant(batch);
        enrollments.save(e);
        batches.assignStudentNumber(student.id, r.batchId());
        audit.record(currentUser.require(auth).id, "ADMIN_ACCESS_GRANTED", request,
            "Student #" + student.id + " course #" + course.id + " one-time course fee verified offline");
        Map<String, Object> body = new HashMap<>();
        body.put("message", "Access active until " + e.expiresAt.toString().substring(0, 10) + ".");
        body.put("expiresAt", e.expiresAt.toString());
        return body;
    }
}
