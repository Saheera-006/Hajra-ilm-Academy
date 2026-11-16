package com.hajara.academy.portal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.MessagingException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
class StudentMail {
    private static final Logger LOG = LoggerFactory.getLogger(StudentMail.class);
    private final ObjectProvider<JavaMailSender> senders;
    private final String from;
    private final String host;

    StudentMail(ObjectProvider<JavaMailSender> senders, @Value("${app.student-mail.from}") String from,
            @Value("${spring.mail.host}") String host) {
        this.senders = senders;
        this.from = from;
        this.host = host;
    }

    void verification(String email, String code) {
        if (!sendCode(email, "Verify your email", code, 15))
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Could not send the verification email. Please try again in one minute.");
    }

    void passwordReset(String email, String code) {
        sendCode(email, "Reset your password", code, 5);
    }

    private boolean sendCode(String email, String title, String code, int minutes) {
        if (from.isBlank() || host.isBlank()) return false;
        JavaMailSender sender = senders.getIfAvailable();
        if (sender == null) return false;
        String instruction = "Copy this code and enter it in the academy website. It expires in " + minutes + " minutes.";
        String plain = "Hajara Ilm Academy\n\n" + title + "\n\n" + code + "\n\n" + instruction
            + "\n\nIf you did not request this code, you can ignore this email.";
        String html = """
            <div style="background:#f3f5f8;padding:24px 12px;font-family:Arial,sans-serif;color:#172d43">
              <div style="max-width:520px;margin:auto;background:white;border:1px solid #dce4ed;border-radius:16px">
                <div style="background:#172d43;color:#f5daa0;padding:20px 24px;border-radius:16px 16px 0 0">
                  <strong>Hajara Ilm Academy</strong>
                </div>
                <div style="padding:24px">
                  <h1 style="margin:0 0 16px;font-size:24px">%s</h1>
                  <p>%s</p>
                  <p style="background:#f6f1e5;border-radius:12px;padding:18px;text-align:center">
                    <strong style="font: bold 30px monospace;letter-spacing:5px">%s</strong>
                  </p>
                  <p style="font-size:13px;color:#51657b">If you did not request this code, you can ignore this email.</p>
                </div>
              </div>
            </div>
            """.formatted(title, instruction, code);
        try {
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(email);
            helper.setSubject(title + " | Hajara Ilm Academy");
            helper.setText(plain, html);
            sender.send(message);
            return true;
        } catch (MailException | MessagingException e) {
            LOG.warn("Student code email could not be sent ({})", e.getClass().getSimpleName());
            return false;
        }
    }

    boolean welcome(String email, String name, String studentId) {
        return send(email, "Welcome to Hajara Ilm Academy",
            "Assalamu Alaikum " + name + ",\n\nYour student account for the Islamic Learning Programme "
            + "has been created. Your student ID is " + studentId
            + ". You can now sign in to the student portal.\n\nHajara Ilm Academy");
    }

    private boolean send(String email, String subject, String body) {
        if (from.isBlank() || host.isBlank()) return false;
        JavaMailSender sender = senders.getIfAvailable();
        if (sender == null) return false;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(subject);
        message.setText(body);
        try {
            sender.send(message);
            return true;
        } catch (MailException e) {
            LOG.warn("Student email could not be sent ({})", e.getClass().getSimpleName());
            return false;
        }
    }
}
