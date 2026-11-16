
package com.hajara.academy.portal;

import com.google.api.client.googleapis.util.Utils;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.SendResponse;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class StudentPush {

    private static final Logger log =
        LoggerFactory.getLogger(StudentPush.class);

    record Delivery(int accepted, int failed, String status) {}

    private final JdbcTemplate db;
    private final String project;

    private FirebaseMessaging messaging;

    StudentPush(
        JdbcTemplate db,
        @Value("${FCM_PROJECT_ID:}") String project
    ) {
        this.db = db;
        this.project = project == null ? "" : project.trim();
    }

    boolean enabled() {
        return !project.isBlank();
    }

    // ==================================================
    // FIREBASE INITIALIZATION
    // ==================================================

    private synchronized FirebaseMessaging messaging()
        throws IOException {

        if (messaging == null) {

            log.info(
                "Initializing Firebase Messaging for project: {}",
                project
            );

            GoogleCredentials credentials =
                GoogleCredentials.getApplicationDefault();

            FirebaseOptions options =
                FirebaseOptions.builder()
                    .setProjectId(project)
                    .setCredentials(credentials)

                    // Use Google API HTTP transport
                    // instead of Firebase's default transport.
                    .setHttpTransport(
                        Utils.getDefaultTransport()
                    )

                    .build();

            FirebaseApp app;

            try {
                app = FirebaseApp.getInstance("student-push");
            } catch (IllegalStateException e) {
                app = FirebaseApp.initializeApp(
                    options,
                    "student-push"
                );
            }

            messaging = FirebaseMessaging.getInstance(app);

            log.info(
                "Firebase Messaging initialized using Google API HTTP transport"
            );
        }

        return messaging;
    }

    // ==================================================
    // DELIVER PUSH NOTIFICATIONS
    // ==================================================

    Delivery deliver(
        Long student,
        Long batchId,
        String title,
        String message
    ) {

        if (!enabled()) {

            log.warn(
                "FCM_PROJECT_ID is missing. Push is disabled."
            );

            return new Delivery(
                0,
                0,
                "NOT_CONFIGURED"
            );
        }

        // Find active enrolled students' device tokens.

        String sql = """
            SELECT d.token
            FROM student_push_devices d
            JOIN portal_users u
                ON u.id = d.user_id
            WHERE u.role = 'STUDENT'
              AND EXISTS (
                SELECT 1
                FROM portal_enrollments e
                WHERE e.user_id = u.id
                  AND e.status = 'ACTIVE'
                  AND (
                    e.expires_at IS NULL
                    OR e.expires_at > UTC_TIMESTAMP(6)
                  )
            """;

        List<Long> parameters = new ArrayList<>();

        // Filter by batch when requested.

        if (batchId != null) {

            sql += " AND e.batch_id = ?";

            parameters.add(batchId);
        }

        sql += ")";

        // Filter by individual student when requested.

        if (student != null) {

            sql += " AND d.user_id = ?";

            parameters.add(student);
        }

        List<String> tokens = db.queryForList(
            sql,
            String.class,
            parameters.toArray()
        );

        log.info(
            "Push delivery started. Devices: {}, batch-filtered: {}, student-filtered: {}",
            tokens.size(),
            batchId != null,
            student != null
        );

        if (tokens.isEmpty()) {

            log.warn(
                "No eligible push devices found."
            );

            return new Delivery(
                0,
                0,
                "NO_DEVICES"
            );
        }

        // Limit notification message length to
        // 250 Unicode code points.

        int length = message.codePointCount(
            0,
            message.length()
        );

        String preview =
            length > 250
                ? message.substring(
                    0,
                    message.offsetByCodePoints(0, 250)
                  ) + "…"
                : message;

        int accepted = 0;
        int failed = 0;

        // Firebase multicast supports
        // up to 500 tokens per request.

        for (
            int start = 0;
            start < tokens.size();
            start += 500
        ) {

            List<String> batch = tokens.subList(
                start,
                Math.min(
                    start + 500,
                    tokens.size()
                )
            );

            try {

                MulticastMessage pushMessage =
                    MulticastMessage.builder()

                        .addAllTokens(batch)

                        .putData(
                            "title",
                            title
                        )

                        .putData(
                            "body",
                            preview
                        )

                        .build();

                // Send FCM notifications.

                var result = messaging()
                    .sendEachForMulticast(pushMessage);

                accepted += result.getSuccessCount();

                failed += result.getFailureCount();

                log.info(
                    "FCM multicast result: success={}, failed={}",
                    result.getSuccessCount(),
                    result.getFailureCount()
                );

                // Inspect individual device results.

                List<SendResponse> responses =
                    result.getResponses();

                for (
                    int i = 0;
                    i < responses.size();
                    i++
                ) {

                    SendResponse response =
                        responses.get(i);

                    if (response.isSuccessful()) {
                        continue;
                    }

                    FirebaseMessagingException error =
                        response.getException();

                    if (error == null) {

                        log.warn(
                            "FCM device delivery failed without exception details."
                        );

                        continue;
                    }

                    // Log the full Firebase error.
                    // Never log the FCM device token.

                    log.error(
                        "FCM delivery rejected. MessagingCode={}, ErrorCode={}, Message={}",
                        error.getMessagingErrorCode(),
                        error.getErrorCode(),
                        error.getMessage(),
                        error
                    );

                    // Delete only confirmed
                    // unregistered device tokens.

                    if (
                        error.getMessagingErrorCode()
                            == MessagingErrorCode.UNREGISTERED
                    ) {

                        db.update(
                            "DELETE FROM student_push_devices WHERE token = ?",
                            batch.get(i)
                        );

                        log.warn(
                            "Removed an unregistered FCM device token."
                        );
                    }
                }

            } catch (
                IOException |
                FirebaseMessagingException |
                IllegalArgumentException e
            ) {

                failed += batch.size();

                log.error(
                    "FCM batch delivery failed. Type={}, Message={}",
                    e.getClass().getSimpleName(),
                    e.getMessage(),
                    e
                );
            }
        }

        log.info(
            "Push delivery finished. Accepted={}, Failed={}",
            accepted,
            failed
        );

        return new Delivery(
            accepted,
            failed,
            "ATTEMPTED"
        );
    }
}
