package com.hajara.academy.security;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * TOTP (RFC 6238, SHA-1, 6 digits, 30 s) helper plus AES-256-GCM encryption of the stored secret.
 * The encryption key comes from ADMIN_MFA_ENCRYPTION_KEY (base64, 32 bytes).
 */
@Component
public class AdminTotp {

    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final long STEP_SECONDS = 30L;

    private final byte[] key;
    private final SecureRandom random = new SecureRandom();

    public AdminTotp(@Value("${ADMIN_MFA_ENCRYPTION_KEY:}") String encodedKey) {
        String trimmed = encodedKey == null ? "" : encodedKey.trim();
        if (trimmed.isEmpty()) {
            this.key = null;
            return;
        }
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(trimmed);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("ADMIN_MFA_ENCRYPTION_KEY is not valid base64", e);
        }
        if (decoded.length != 32) {
            throw new IllegalStateException("ADMIN_MFA_ENCRYPTION_KEY must be a base64 encoded 32-byte key");
        }
        this.key = decoded;
    }

    public boolean configured() {
        return key != null;
    }

    /** New random 160-bit secret, base32 encoded (what authenticator apps expect). */
    public String newSecret() {
        byte[] bytes = new byte[20];
        random.nextBytes(bytes);
        StringBuilder out = new StringBuilder();
        int buffer = 0;
        int bits = 0;
        for (byte b : bytes) {
            buffer = (buffer << 8) | (b & 0xFF);
            bits += 8;
            while (bits >= 5) {
                bits -= 5;
                out.append(BASE32.charAt((buffer >> bits) & 31));
            }
        }
        if (bits > 0) {
            out.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        }
        return out.toString();
    }

    public String encrypt(String secret) {
        requireKey();
        try {
            byte[] iv = new byte[12];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(
                ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array());
        } catch (Exception e) {
            throw new IllegalStateException("MFA encryption failed", e);
        }
    }

    public String decrypt(String stored) {
        requireKey();
        try {
            ByteBuffer buffer = ByteBuffer.wrap(Base64.getDecoder().decode(stored));
            byte[] iv = new byte[12];
            buffer.get(iv);
            byte[] ciphertext = new byte[buffer.remaining()];
            buffer.get(ciphertext);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("MFA decryption failed (wrong ADMIN_MFA_ENCRYPTION_KEY?)", e);
        }
    }

    /**
     * Returns the time step whose code matches (current step or one either side, for clock drift),
     * or -1 when the code is wrong. The caller must reject steps that were already used.
     */
    public long matchingStep(String secret, String code) {
        if (code == null || !code.matches("[0-9]{6}")) {
            return -1;
        }
        long now = System.currentTimeMillis() / 1000L / STEP_SECONDS;
        long match = -1;
        for (long step = now - 1; step <= now + 1; step++) {
            if (constantTimeEquals(code, codeAt(secret, step))) {
                match = step;
            }
        }
        return match;
    }

    /** The 6-digit code for a given time step (package-private so tests can check RFC vectors). */
    String codeAt(String secret, long step) {
        try {
            byte[] data = ByteBuffer.allocate(8).putLong(step).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(decodeBase32(secret), "HmacSHA1"));
            byte[] hash = mac.doFinal(data);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                | ((hash[offset + 1] & 0xFF) << 16)
                | ((hash[offset + 2] & 0xFF) << 8)
                | (hash[offset + 3] & 0xFF);
            return String.format(Locale.ROOT, "%06d", binary % 1_000_000);
        } catch (Exception e) {
            throw new IllegalStateException("Could not compute TOTP code", e);
        }
    }

    private static byte[] decodeBase32(String value) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        int buffer = 0;
        int bits = 0;
        for (char ch : value.toCharArray()) {
            int n = BASE32.indexOf(ch);
            if (n < 0) {
                throw new IllegalArgumentException("Invalid TOTP secret");
            }
            buffer = (buffer << 5) | n;
            bits += 5;
            if (bits >= 8) {
                bits -= 8;
                out.write((buffer >> bits) & 0xFF);
            }
        }
        return out.toByteArray();
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private void requireKey() {
        if (key == null) {
            throw new IllegalStateException("ADMIN_MFA_ENCRYPTION_KEY is not configured");
        }
    }
}
