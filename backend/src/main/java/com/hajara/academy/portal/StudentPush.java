package com.hajara.academy.portal;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.MulticastMessage;
import java.io.IOException;
import java.util.List;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class StudentPush {
    record Delivery(int accepted, int failed, String status) {}

    private final JdbcTemplate db;
    private final String project;
    private FirebaseMessaging messaging;

    StudentPush(JdbcTemplate db, @Value("${FCM_PROJECT_ID:}") String project) {
        this.db = db;
        this.project = project;
    }

    boolean enabled() {
        return !project.isBlank();
    }

    private synchronized FirebaseMessaging messaging() throws IOException {
        if (messaging == null) {
            var options = FirebaseOptions.builder().setProjectId(project)
                .setCredentials(GoogleCredentials.getApplicationDefault()).build();
            messaging = FirebaseMessaging.getInstance(FirebaseApp.initializeApp(options, "student-push"));
        }
        return messaging;
    }

    Delivery deliver(Long student, Long batchId, String title, String message) {
        if (!enabled()) return new Delivery(0, 0, "NOT_CONFIGURED");
        var sql = """
            SELECT d.token FROM student_push_devices d JOIN portal_users u ON u.id=d.user_id
            WHERE u.role='STUDENT' AND EXISTS (
                SELECT 1 FROM portal_enrollments e WHERE e.user_id=u.id AND e.status='ACTIVE'
                AND (e.expires_at IS NULL OR e.expires_at > UTC_TIMESTAMP(6))
            """;
        var parameters = new java.util.ArrayList<Long>();
        if (batchId != null) {
            sql += " AND e.batch_id=?";
            parameters.add(batchId);
        }
        sql += ")";
        if (student != null) {
            sql += " AND d.user_id=?";
            parameters.add(student);
        }
        List<String> tokens = db.queryForList(sql, String.class, parameters.toArray());
        int length = message.codePointCount(0, message.length());
        String preview = length > 250
            ? message.substring(0, message.offsetByCodePoints(0, 250)) + "…"
            : message;
        int accepted = 0;
        int failed = 0;
        for (int start = 0; start < tokens.size(); start += 500) {
            var batch = tokens.subList(start, Math.min(start + 500, tokens.size()));
            try {
                var result = messaging().sendEachForMulticast(MulticastMessage.builder()
                    .addAllTokens(batch).putData("title", title).putData("body", preview).build());
                accepted += result.getSuccessCount();
                failed += result.getFailureCount();
                for (int i = 0; i < batch.size(); i++) {
                    var error = result.getResponses().get(i).getException();
                    if (error != null) {
                        LoggerFactory.getLogger(StudentPush.class).warn("FCM device rejected: {} ({})",
                            error.getMessagingErrorCode(), error.getErrorCode());
                    }
                    if (error != null && error.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                        db.update("DELETE FROM student_push_devices WHERE token=?", batch.get(i));
                    }
                }
            } catch (IOException | FirebaseMessagingException | IllegalArgumentException e) {
                LoggerFactory.getLogger(StudentPush.class).warn("FCM push failed ({})", e.getClass().getSimpleName());
                failed += batch.size();
            }
        }
        return new Delivery(accepted, failed, tokens.isEmpty() ? "NO_DEVICES" : "ATTEMPTED");
    }
}
