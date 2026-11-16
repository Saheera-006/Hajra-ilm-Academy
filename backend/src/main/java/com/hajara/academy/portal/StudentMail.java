
package com.hajara.academy.portal;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
class StudentMail {

    private static final Logger LOG =
            LoggerFactory.getLogger(StudentMail.class);

    private static final URI RESEND_URL =
            URI.create("https://api.resend.com/emails");

    private final HttpClient httpClient;
    private final ObjectMapper mapper;
    private final String apiKey;
    private final String from;

    StudentMail(
            @Value("${app.resend.api-key:}") String apiKey,
            @Value("${app.resend.from:}") String from) {

        this.apiKey = apiKey.trim();
        this.from = from.trim();

        this.mapper = new ObjectMapper();

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    void verification(String email, String code) {
        if (!sendCode(email, "Verify your email", code, 15)) {
            throw new EmailDeliveryException();
        }
    }

    void passwordReset(String email, String code) {
        if (!sendCode(email, "Reset your password", code, 5)) {
            throw new EmailDeliveryException();
        }
    }

    private boolean sendCode(
            String email,
            String title,
            String code,
            int minutes) {

        String instruction =
                "Copy this code and enter it in the academy website. "
                + "It expires in " + minutes + " minutes.";

        String plain =
                "Hajara Ilm Academy\n\n"
                + title + "\n\n"
                + code + "\n\n"
                + instruction
                + "\n\nIf you did not request this code, "
                + "you can ignore this email.";

        String html = """
            <div style="background:#f3f5f8;padding:24px 12px;
                        font-family:Arial,sans-serif;color:#172d43">
              <div style="max-width:520px;margin:auto;background:white;
                          border:1px solid #dce4ed;border-radius:16px">
                <div style="background:#172d43;color:#f5daa0;
                            padding:20px 24px;border-radius:16px 16px 0">
                  <strong>Hajara Ilm Academy</strong>
                </div>
                <div style="padding:24px">
                  <h1 style="margin:0 0 16px;font-size:24px">%s</h1>
                  <p>%s</p>
                  <p style="background:#f6f1e5;border-radius:12px;
                            padding:18px;text-align:center">
                    <strong style="font:bold 30px monospace;
                                   letter-spacing:5px">%s</strong>
                  </p>
                  <p style="font-size:13px;color:#51657b">
                    If you did not request this code,
                    you can ignore this email.
                  </p>
                </div>
              </div>
            </div>
            """.formatted(title, instruction, code);

        return sendEmail(
                email,
                title + " | Hajara Ilm Academy",
                plain,
                html
        );
    }

    boolean welcome(String email, String name, String studentId) {
        String body =
                "Assalamu Alaikum " + name + ",\n\n"
                + "Your student account for the Islamic Learning Programme "
                + "has been created. Your student ID is " + studentId
                + ". You can now sign in to the student portal."
                + "\n\nHajara Ilm Academy";

        return sendEmail(
                email,
                "Welcome to Hajara Ilm Academy",
                body,
                null
        );
    }

    private boolean sendEmail(
            String email,
            String subject,
            String plain,
            String html) {

        if (apiKey.isBlank() || from.isBlank()) {
            LOG.error("Resend email configuration is incomplete");
            return false;
        }

        try {
            ObjectNode payload = mapper.createObjectNode();

            payload.put("from", from);
            payload.putArray("to").add(email);
            payload.put("subject", subject);
            payload.put("text", plain);

            if (html != null) {
                payload.put("html", html);
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(RESEND_URL)
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            mapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            int status = response.statusCode();

            if (status >= 200 && status < 300) {
                LOG.info("Resend accepted student email request");
                return true;
            }

            // Avoid logging API keys, OTPs or recipient addresses.
            LOG.error(
                    "Resend email request failed. HTTP status: {}",
                    status
            );

            return false;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            LOG.error("Resend email request interrupted");
            return false;

        } catch (IOException | RuntimeException e) {
            LOG.error(
                    "Resend email request failed. Exception type: {}",
                    e.getClass().getSimpleName()
            );
            return false;
        }
    }

    static class EmailDeliveryException extends RuntimeException {
        EmailDeliveryException() {
            super("Student email delivery failed");
        }
    }
}
