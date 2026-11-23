
package com.hajara.academy.portal;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Admin-only endpoints for batch details, student directory,
 * student profiles and attendance management.
 *
 * Routes under /api/portal/admin/** are restricted to ROLE_ADMIN
 * by SecurityConfig.
 */
@RestController
@RequestMapping("/api/portal/admin")
public class AdminOpsController {

    private static final Set<String> STATUSES =
            Set.of("PRESENT", "ABSENT");

    private final JdbcTemplate jdbc;
    private final BatchService batches;
    private final CurrentUser current;
    private final AuditLog audit;
    private final ZoneId zone;

    public AdminOpsController(
            JdbcTemplate jdbc,
            BatchService batches,
            CurrentUser current,
            AuditLog audit,
            @Value("${app.timezone:Asia/Kolkata}") String timezone) {

        this.jdbc = jdbc;
        this.batches = batches;
        this.current = current;
        this.audit = audit;
        this.zone = ZoneId.of(timezone);
    }

    // =========================================================
    // BATCH MANAGEMENT
    // =========================================================

    @GetMapping("/batches/{id}")
    public Map<String, Object> batch(@PathVariable Long id) {
        return batches.get(id);
    }

    /**
     * Switch batch registration ON/OFF.
     * Opening one batch closes the previously open batch.
     */
    @PutMapping("/batches/{id}/registration")
    public Map<String, Object> registration(
            Authentication auth,
            HttpServletRequest req,
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {

        Boolean open = body.get("open");

        if (open == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "open (true/false) is required"
            );
        }

        Map<String, Object> result =
                batches.setRegistration(id, open);

        audit.record(
                current.require(auth).id,
                open
                        ? "BATCH_REGISTRATION_OPENED"
                        : "BATCH_REGISTRATION_CLOSED",
                req,
                "Batch #" + id
        );

        return result;
    }

    /**
     * Paginated batch roster with attendance summary.
     */
    @GetMapping("/batches/{id}/roster")
    public Map<String, Object> roster(
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        batches.get(id);

        int s = Math.max(1, Math.min(size, 100));
        int p = Math.max(0, page);

        String like = "%" + q.trim().toLowerCase() + "%";

        String where =
                " FROM portal_enrollments e " +
                " JOIN portal_users u ON u.id = e.user_id " +
                " WHERE e.batch_id = ? " +
                " AND ( " +
                " LOWER(COALESCE(u.student_number, '')) LIKE ? " +
                " OR LOWER(u.full_name) LIKE ? " +
                " ) ";

        Integer total = jdbc.queryForObject(
                "SELECT COUNT(*)" + where,
                Integer.class,
                id, like, like
        );

        List<Map<String, Object>> items =
                jdbc.queryForList(

                "SELECT " +
                " u.id AS userId, " +
                " e.id AS enrollmentId, " +
                " u.student_number AS studentId, " +
                " u.full_name AS name, " +
                " e.status AS enrollmentStatus, " +
                " u.email, " +
                " u.phone, " +

                " (SELECT COUNT(*) " +
                " FROM portal_attendance a " +
                " WHERE a.enrollment_id = e.id " +
                " AND a.status = 'PRESENT') AS present, " +

                " (SELECT COUNT(*) " +
                " FROM portal_attendance a " +
                " WHERE a.enrollment_id = e.id) AS marked " +

                where +

                " ORDER BY u.student_number IS NULL, " +
                " u.student_number, u.id " +
                " LIMIT ? OFFSET ?",

                id, like, like, s, p * s
        );

        return Map.of(
                "items", items,
                "total", total == null ? 0 : total,
                "page", p,
                "size", s
        );
    }

    // =========================================================
    // STUDENT DIRECTORY - TIDB COMPATIBLE
    // =========================================================

    /**
     * Paginated student directory.
     *
     * Uses a derived table to retrieve each student's latest
     * enrollment instead of a subquery in the JOIN ON clause.
     */
    @GetMapping("/students/directory")
    public Map<String, Object> directory(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) Long batchId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        int s = Math.max(1, Math.min(size, 100));
        int p = Math.max(0, page);

        String like = "%" + q.trim().toLowerCase() + "%";

        List<Object> args =
                new ArrayList<>(List.of(like, like));

        // TiDB-compatible JOIN
        String where =
                " FROM portal_users u " +

                " LEFT JOIN ( " +
                " SELECT user_id, MAX(id) AS latest_id " +
                " FROM portal_enrollments " +
                " GROUP BY user_id " +
                " ) latest ON latest.user_id = u.id " +

                " LEFT JOIN portal_enrollments e " +
                " ON e.id = latest.latest_id " +

                " LEFT JOIN academy_batches b " +
                " ON b.id = e.batch_id " +

                " WHERE u.role = 'STUDENT' " +

                " AND ( " +
                " LOWER(COALESCE(u.student_number, '')) LIKE ? " +
                " OR LOWER(u.full_name) LIKE ? " +
                " ) ";

        if (batchId != null) {
            where += " AND e.batch_id = ? ";
            args.add(batchId);
        }

        Integer total = jdbc.queryForObject(
                "SELECT COUNT(*)" + where,
                Integer.class,
                args.toArray()
        );

        args.add(s);
        args.add(p * s);

        List<Map<String, Object>> items =
                jdbc.queryForList(

                "SELECT " +
                " u.id AS userId, " +
                " u.student_number AS studentId, " +
                " u.full_name AS name, " +
                " b.id AS batchId, " +
                " b.name AS batchName, " +
                " e.status AS enrollmentStatus, " +
                " u.email, " +
                " u.phone " +

                where +

                " ORDER BY u.student_number IS NULL, " +
                " u.student_number, u.id " +
                " LIMIT ? OFFSET ?",

                args.toArray()
        );

        return Map.of(
                "items", items,
                "total", total == null ? 0 : total,
                "page", p,
                "size", s
        );
    }

    // =========================================================
    // STUDENT PROFILE
    // =========================================================

    @GetMapping("/students/{userId}/profile")
    public Map<String, Object> profile(
            @PathVariable Long userId) {

        var users = jdbc.queryForList(

                "SELECT id, full_name AS name, " +
                "student_number AS studentId, " +
                "email, phone, age, " +
                "created_at AS createdAt " +
                "FROM portal_users " +
                "WHERE id = ? AND role = 'STUDENT'",

                userId
        );

        if (users.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Student not found"
            );
        }

        var enrollments = jdbc.queryForList(

                "SELECT e.id, e.status, " +
                "e.created_at AS createdAt, " +
                "e.expires_at AS expiresAt, " +
                "b.id AS batchId, b.name AS batchName " +
                "FROM portal_enrollments e " +
                "LEFT JOIN academy_batches b " +
                "ON b.id = e.batch_id " +
                "WHERE e.user_id = ? " +
                "ORDER BY e.id DESC",

                userId
        );

        var attendance = jdbc.queryForList(

                "SELECT a.class_date AS classDate, a.status " +
                "FROM portal_attendance a " +
                "JOIN portal_enrollments e " +
                "ON e.id = a.enrollment_id " +
                "WHERE e.user_id = ? " +
                "ORDER BY a.class_date DESC LIMIT 200",

                userId
        );

        var certificates = jdbc.queryForList(

                "SELECT c.id, " +
                "c.certificate_code AS certificateCode, " +
                "c.issued_at AS issuedAt " +
                "FROM academy_certificates c " +
                "JOIN portal_enrollments e " +
                "ON e.id = c.enrollment_id " +
                "WHERE e.user_id = ? " +
                "ORDER BY c.issued_at DESC",

                userId
        );

        Map<String, Object> out = new LinkedHashMap<>();

        out.put("student", users.get(0));
        out.put("enrollments", enrollments);
        out.put("attendance", attendance);
        out.put("certificates", certificates);

        return out;
    }

    // =========================================================
    // ATTENDANCE CONTEXT
    // =========================================================

    @GetMapping("/attendance/context")
    public Map<String, Object> attendanceContext() {

        var open = jdbc.queryForList(
                "SELECT id, name " +
                "FROM academy_batches " +
                "WHERE status = 'OPEN' LIMIT 1"
        );

        var latest = jdbc.queryForList(
                "SELECT id, name " +
                "FROM academy_batches " +
                "ORDER BY created_at DESC, id DESC LIMIT 1"
        );

        Map<String, Object> out = new LinkedHashMap<>();

        out.put("today", LocalDate.now(zone).toString());
        out.put("timezone", zone.getId());
        out.put("noOpenBatch", open.isEmpty());

        var chosen = !open.isEmpty()
                ? open.get(0)
                : (latest.isEmpty() ? null : latest.get(0));

        out.put(
                "defaultBatchId",
                chosen == null ? null : chosen.get("id")
        );

        out.put(
                "defaultBatchName",
                chosen == null ? null : chosen.get("name")
        );

        return out;
    }

    // =========================================================
    // ATTENDANCE SHEET
    // =========================================================

    @GetMapping("/attendance/sheet")
    public Map<String, Object> sheet(
            @RequestParam Long batchId,
            @RequestParam String date) {

        LocalDate d = parseDate(date);

        Map<String, Object> batch = batches.get(batchId);

        List<Map<String, Object>> students =
                jdbc.queryForList(

                "SELECT " +
                " e.id AS enrollmentId, " +
                " u.student_number AS studentId, " +
                " u.full_name AS name, " +
                " a.status AS status " +

                " FROM portal_enrollments e " +

                " JOIN portal_users u " +
                " ON u.id = e.user_id " +

                " LEFT JOIN portal_attendance a " +
                " ON a.enrollment_id = e.id " +
                " AND a.class_date = ? " +

                " WHERE e.batch_id = ? " +

                " ORDER BY u.student_number IS NULL, " +
                " u.student_number, u.id",

                d, batchId
        );

        return Map.of(
                "batchId", batchId,
                "batchName", batch.get("name"),
                "date", d.toString(),
                "students", students
        );
    }

    // =========================================================
    // SAVE ATTENDANCE
    // =========================================================

    /**
     * Save attendance in one transaction.
     * All changes are recorded in the audit table.
     */
    @PutMapping("/attendance/sheet")
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> saveSheet(
            Authentication auth,
            HttpServletRequest req,
            @RequestBody Map<String, Object> body) {

        Long batchId =
                body.get("batchId") instanceof Number n
                        ? n.longValue()
                        : null;

        if (batchId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "batchId is required"
            );
        }

        LocalDate d =
                parseDate(String.valueOf(body.get("date")));

        if (d.isAfter(LocalDate.now(zone))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Attendance cannot be recorded for a future date"
            );
        }

        batches.get(batchId);

        Object raw = body.get("records");

        if (!(raw instanceof List<?> list)
                || list.isEmpty()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No attendance records submitted"
            );
        }

        if (list.size() > 500) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Too many records in one request"
            );
        }

        Set<Long> members = new HashSet<>(
                jdbc.queryForList(
                        "SELECT id FROM portal_enrollments WHERE batch_id = ?",
                        Long.class,
                        batchId
                )
        );

        Map<Long, String> wanted = new LinkedHashMap<>();

        for (Object o : list) {

            Map<String, Object> r =
                    (Map<String, Object>) o;

            Long eid =
                    r.get("enrollmentId") instanceof Number n
                            ? n.longValue()
                            : null;

            String status =
                    r.get("status") == null
                            ? null
                            : String.valueOf(r.get("status"));

            if (eid == null || !members.contains(eid)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "A submitted student does not belong to this batch. Nothing was saved."
                );
            }

            if (status == null || !STATUSES.contains(status)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Status must be PRESENT or ABSENT. Nothing was saved."
                );
            }

            wanted.put(eid, status);
        }

        Long adminId = current.require(auth).id;

        int created = 0;
        int updated = 0;
        int unchanged = 0;

        for (var entry : wanted.entrySet()) {

            var existing = jdbc.queryForList(
                    "SELECT id, status " +
                    "FROM portal_attendance " +
                    "WHERE enrollment_id = ? AND class_date = ? " +
                    "FOR UPDATE",
                    entry.getKey(),
                    d
            );

            if (existing.isEmpty()) {

                jdbc.update(
                        "INSERT INTO portal_attendance " +
                        "(enrollment_id, class_date, status, marked_by, updated_at) " +
                        "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(6))",
                        entry.getKey(),
                        d,
                        entry.getValue(),
                        adminId
                );

                jdbc.update(
                        "INSERT INTO portal_attendance_audit " +
                        "(enrollment_id, class_date, old_status, new_status, changed_by) " +
                        "VALUES (?, ?, NULL, ?, ?)",
                        entry.getKey(),
                        d,
                        entry.getValue(),
                        adminId
                );

                created++;

            } else if (!entry.getValue().equals(
                    existing.get(0).get("status"))) {

                jdbc.update(
                        "UPDATE portal_attendance " +
                        "SET status = ?, marked_by = ?, " +
                        "updated_at = CURRENT_TIMESTAMP(6) " +
                        "WHERE id = ?",
                        entry.getValue(),
                        adminId,
                        existing.get(0).get("id")
                );

                jdbc.update(
                        "INSERT INTO portal_attendance_audit " +
                        "(enrollment_id, class_date, old_status, new_status, changed_by) " +
                        "VALUES (?, ?, ?, ?, ?)",
                        entry.getKey(),
                        d,
                        existing.get(0).get("status"),
                        entry.getValue(),
                        adminId
                );

                updated++;

            } else {
                unchanged++;
            }
        }

        audit.record(
                adminId,
                "ATTENDANCE_SAVED",
                req,
                "Batch #" + batchId + " " + d +
                ": " + created + " new, " +
                updated + " changed"
        );

        return Map.of(
                "message", "Attendance saved",
                "created", created,
                "updated", updated,
                "unchanged", unchanged
        );
    }

    // =========================================================
    // DATE VALIDATION
    // =========================================================

    private static LocalDate parseDate(String v) {

        try {
            return LocalDate.parse(v);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid date (use yyyy-MM-dd)"
            );
        }
    }
}
