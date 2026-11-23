package com.hajara.academy.portal;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Downloadable identity card; never exposes another student's record. */
@RestController
@RequestMapping("/api/portal")
public class StudentIdCardController {
    private final JdbcTemplate jdbc;
    private final CurrentUser current;

    public StudentIdCardController(JdbcTemplate jdbc, CurrentUser current) {
        this.jdbc = jdbc;
        this.current = current;
    }

    @GetMapping("/my-student-id/card.pdf")
    public ResponseEntity<byte[]> card(Authentication auth) throws IOException {
        Long userId = current.require(auth).id;
        List<Map<String, Object>> records = jdbc.queryForList(
            "SELECT u.full_name, u.student_number, b.name AS batch_name, " +
            "c.title AS course_title FROM portal_users u " +
            "JOIN portal_enrollments e ON e.user_id=u.id " +
            "JOIN academy_batches b ON b.id=e.batch_id " +
            "JOIN portal_courses c ON c.id=e.course_id " +
            "WHERE u.id=? AND u.role='STUDENT' AND u.student_number IS NOT NULL " +
            "AND e.status='ACTIVE' ORDER BY e.id DESC LIMIT 1", userId);
        if (records.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No active batch enrollment or student ID card");
        }
        Map<String, Object> record = records.get(0);
        byte[] pdf;
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(new PDRectangle(480, 300));
            document.addPage(page);
            try (PDPageContentStream canvas = new PDPageContentStream(document, page)) {
                canvas.setNonStrokingColor(17, 43, 72);
                canvas.addRect(0, 0, 480, 300);
                canvas.fill();
                canvas.setNonStrokingColor(249, 246, 238);
                canvas.addRect(15, 15, 450, 270);
                canvas.fill();
                canvas.setStrokingColor(177, 141, 75);
                canvas.setLineWidth(2);
                canvas.addRect(23, 23, 434, 254);
                canvas.stroke();
                write(canvas, "HAJARA ILM ACADEMY", 47, 243, 20, true);
                write(canvas, "OFFICIAL STUDENT IDENTITY CARD", 47, 218, 10, false);
                write(canvas, "STUDENT NAME", 47, 177, 9, false);
                write(canvas, printable(record.get("full_name")), 47, 157, 16, true);
                write(canvas, "STUDENT ID", 47, 125, 9, false);
                write(canvas, printable(record.get("student_number")), 47, 105, 16, true);
                write(canvas, "BATCH: " + printable(record.get("batch_name")), 47, 75, 11, false);
                write(canvas, "COURSE: " + printable(record.get("course_title")), 47, 52, 10, false);
            }
            document.save(output);
            pdf = output.toByteArray();
        }
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=HIA-student-id.pdf")
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(pdf);
    }

    private static String printable(Object value) {
        String text = Objects.toString(value, "").replaceAll("[^\\x20-\\x7E]", " ");
        return text.length() > 48 ? text.substring(0, 48) : text;
    }

    private static void write(PDPageContentStream canvas, String text, float x, float y, int size, boolean bold)
            throws IOException {
        canvas.beginText();
        canvas.setNonStrokingColor(17, 43, 72);
        canvas.setFont(new PDType1Font(bold ? Standard14Fonts.FontName.HELVETICA_BOLD
            : Standard14Fonts.FontName.HELVETICA), size);
        canvas.newLineAtOffset(x, y);
        canvas.showText(printable(text));
        canvas.endText();
    }
}
