
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

    private static final URI BREVO_URL =
            URI.create("https://api.brevo.com/v3/smtp/email");

    private final HttpClient httpClient;
    private final ObjectMapper mapper;
    private final String apiKey;
    private final String senderEmail;
    private final String senderName;

    StudentMail(
            @Value("${app.brevo.api-key:}") String apiKey,
            @Value("${app.brevo.sender-email:}") String senderEmail,
            @Value("${app.brevo.sender-name:Hajara Ilm Academy}") String senderName) {

        this.apiKey = apiKey.trim();
        this.senderEmail = senderEmail.trim();
        this.senderName = senderName.trim();

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

    private static String esc(String value) {
        return org.springframework.web.util.HtmlUtils.htmlEscape(value == null ? "" : value);
    }

    @Value("${app.public-url:https://hajarailmacademy.pages.dev}")
    private String publicUrl;

    boolean enrollmentWelcome(String email, String name, String studentId, String whatsapp, byte[] pdf, boolean offline) {
        String base = publicUrl.replaceAll("/+$", "");
        String login = base + "/login";
        String setup = base + "/forgot-password";
        boolean hasGroup = whatsapp != null && !whatsapp.isBlank() && (whatsapp.startsWith("https://chat.whatsapp.com/") || whatsapp.startsWith("https://wa.me/") || whatsapp.startsWith("https://whatsapp.com/"));
        String instructions = offline ? "Set your password using the secure email-code password setup page before signing in." : "Sign in using your registered email and the password you created during registration.";
        String plain = "Assalamu Alaikum Wa Rahmatullahi Wa Barakatuh, " + name + "!\n\nWelcome to Hajara Ilm Academy. Your Islamic Learning Programme enrollment is confirmed.\nStudent ID: " + studentId + "\nRegistered email: " + email + "\n" + instructions + "\nLogin: " + login + (offline ? "\nSet password: " + setup : "") + (hasGroup ? "\nJoin WhatsApp Group: " + whatsapp : "") + (pdf != null ? "\nYour payment receipt is attached." : "") + "\nMay Allah grant you beneficial knowledge. Ameen.";
        String html = "<div style='background:#f3f5f8;padding:20px;font-family:Arial,sans-serif;color:#172d43'><div style='max-width:560px;margin:auto;background:white;border:1px solid #ddd;border-radius:14px;overflow:hidden'>"
            + "<div style='background:#10254c;color:#e6c77b;padding:24px;text-align:center'><img width='76' alt='Academy logo' src='" + esc(base + "/logo-transparent.png") + "'><h2>Hajara Ilm Academy</h2>Islamic Learning Programme</div>"
            + "<div style='padding:24px'><h2>Welcome to Hajara Ilm Academy!</h2><p><strong>Assalamu Alaikum Wa Rahmatullahi Wa Barakatuh,</strong></p><p>Dear " + esc(name) + ",</p><p>Alhamdulillah! Your enrollment is confirmed. May Allah bless your learning journey and grant you beneficial knowledge. Ameen.</p>"
            + "<div style='background:#f3f5f8;padding:16px;border-radius:8px'><strong>Student ID:</strong> " + esc(studentId) + "<br><strong>Registered email:</strong> " + esc(email) + "</div><h3>Access Your Student Dashboard</h3><p>" + instructions + "</p>"
            + (offline ? button(setup,"Set Your Password","#173b75") : "") + button(login,"Login to Student Dashboard","#173b75")
            + (hasGroup ? "<h3>Join Your WhatsApp Group</h3><p>Receive class schedules and important updates.</p>" + button(whatsapp,"Join WhatsApp Group","#16834b") : "")
            + (pdf != null ? "<h3>Payment Receipt</h3><p>Your payment receipt is attached as a PDF.</p>" : "") + "<p>Jazakillahu Khairan,<br>Hajara Ilm Academy</p></div><div style='background:#10254c;color:#e6c77b;padding:16px;text-align:center'>Hajara Ilm Academy</div></div></div>";
        return sendEmail(email,"Welcome to Hajara Ilm Academy | Enrollment confirmed",plain,html,pdf);
    }
    private static String button(String url,String label,String color) {
        return "<p><a style='display:inline-block;background:" + color + ";color:white;padding:12px 18px;border-radius:8px;text-decoration:none' href='" + esc(url) + "'>" + label + "</a></p>";
    }

    boolean certificate(String email, String name, String code, byte[] pdf) {
        String base = publicUrl.replaceAll("/+$", "");
        String plain = "Assalamu Alaikum, " + name + "!\n\nYour Islamic Learning Programme certificate has been issued. Your PDF is attached.\nCertificate: " + code + "\nLogin: " + base + "/login\nMay Allah grant you beneficial knowledge. Ameen.";
        String html = "<div style='font-family:Arial;color:#172d43;max-width:560px;margin:auto'><div style='background:#10254c;color:#e6c77b;padding:24px;text-align:center'><img width='76' alt='Academy logo' src='" + esc(base + "/logo-transparent.png") + "'><h2>Hajara Ilm Academy</h2>Certificate of Completion</div><div style='padding:24px'><h2>Assalamu Alaikum, " + esc(name) + "!</h2><p>Congratulations on completing the Islamic Learning Programme. Your certificate has been issued and is attached as a PDF.</p><p>Certificate: " + esc(code) + "</p>" + button(base + "/login", "Login to Student Dashboard", "#173b75") + "<p>May Allah grant you beneficial knowledge. Ameen.</p><p>Hajara Ilm Academy</p></div></div>";
        return sendEmail(email, "Certificate issued | Hajara Ilm Academy", plain, html, pdf, "HIA-certificate.pdf");
    }

    boolean receipt(String email, String reference, byte[] pdf) {
        return sendEmail(email, "Payment receipt | Hajara Ilm Academy", "Your payment was verified. Your receipt is attached. Reference: " + reference, null, pdf);
    }
    private boolean sendEmail(String email,String subject,String plain,String html) {
        return sendEmail(email,subject,plain,html,null);
    }
    private boolean sendEmail(
            String email,
            String subject,
            String plain,
            String html, byte[] pdf) {
        return sendEmail(email, subject, plain, html, pdf, "Hajara-receipt.pdf");
    }
    private boolean sendEmail(String email, String subject, String plain, String html, byte[] pdf, String filename) {

        if (apiKey.isBlank() || senderEmail.isBlank()) {
            LOG.error("Brevo email configuration is incomplete");
            return false;
        }

        try {
            ObjectNode payload = mapper.createObjectNode();

            ObjectNode sender = payload.putObject("sender");
            sender.put("name", senderName);
            sender.put("email", senderEmail);

            ObjectNode recipient = payload.putArray("to").addObject();
            recipient.put("email", email);

            payload.put("subject", subject);
            payload.put("textContent", plain);

            if (html != null) {
                payload.put("htmlContent", html);
            }

            if (pdf != null) { var attachment = payload.putArray("attachment").addObject(); attachment.put("name",filename); attachment.put("content",java.util.Base64.getEncoder().encodeToString(pdf)); }
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(BREVO_URL)
                    .timeout(Duration.ofSeconds(20))
                    .header("api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
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
                LOG.info("Brevo accepted student email request");
                return true;
            }

            // Never log API keys, OTPs or recipient addresses.
            LOG.error(
                    "Brevo email request failed. HTTP status: {}",
                    status
            );

            return false;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            LOG.error("Brevo email request interrupted");
            return false;

        } catch (IOException | RuntimeException e) {
            LOG.error(
                    "Brevo email request failed. Exception type: {}",
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
