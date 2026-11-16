package com.hajara.academy.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class SecurityUnitTest {

    private final AdminTotp totp = new AdminTotp(Base64.getEncoder().encodeToString(new byte[32]));

    @Test
    void totpMatchesRfc6238Vectors() {
        String secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
        assertEquals("287082", totp.codeAt(secret, 59L / 30));
        assertEquals("081804", totp.codeAt(secret, 1111111109L / 30));
    }

    @Test
    void currentCodeAcceptedAndGarbageRejected() {
        String secret = totp.newSecret();
        long now = System.currentTimeMillis() / 30000;
        assertTrue(totp.matchingStep(secret, totp.codeAt(secret, now)) >= 0);
        assertEquals(-1, totp.matchingStep(secret, "abcdef"));
    }

    @Test
    void secretEncryptionRoundTrips() {
        String secret = totp.newSecret();
        assertEquals(secret, totp.decrypt(totp.encrypt(secret)));
    }

    @Test
    void passwordPolicy() {
        assertNotNull(PasswordPolicy.violation("short1", "a@b.com"));
        assertNotNull(PasswordPolicy.violation("password123", "a@b.com"));
        assertNull(PasswordPolicy.violation("Tr4in-Moon-Basket!", "a@b.com"));
        assertFalse(new AdminTotp("").configured());
    }
}
