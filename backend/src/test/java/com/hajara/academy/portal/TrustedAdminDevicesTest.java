package com.hajara.academy.portal;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.*;
import jakarta.servlet.http.Cookie;
import java.util.*;
import java.time.Instant;

class TrustedAdminDevicesTest {
 final JdbcTemplate db=mock(JdbcTemplate.class);final UserRepo users=mock(UserRepo.class);
 final TrustedAdminDevices trusted=new TrustedAdminDevices(db,users,true);
 final MockHttpServletRequest request=new MockHttpServletRequest();
 PortalUser prepare(){String token="a".repeat(43);request.setCookies(new Cookie("HIA_ADMIN_DEVICE",token));var u=new PortalUser();u.id=1L;u.role="ADMIN";u.mfaEnabled=true;u.passwordHash="password-hash";when(users.findById(1L)).thenReturn(Optional.of(u));when(db.queryForList("SELECT user_id,password_fingerprint FROM admin_trusted_devices WHERE token_hash=? AND expires_at>CURRENT_TIMESTAMP",TrustedAdminDevices.hash(token))).thenReturn(List.of(Map.of("user_id",1L,"password_fingerprint",TrustedAdminDevices.hash(u.passwordHash))));return u;}
 @Test void missingCookieCannotAuthenticate(){assertNull(trusted.restore(request));verifyNoInteractions(db);}
 @Test void verifiedAdminRestores(){var u=prepare();assertSame(u,trusted.restore(request));}
 @Test void passwordChangeInvalidatesRememberedDevice(){var u=prepare();u.passwordHash="changed";assertNull(trusted.restore(request));}
 @Test void roleChangeAndLockoutPreventRestoration(){var u=prepare();u.role="STUDENT";assertNull(trusted.restore(request));u.role="ADMIN";u.lockedUntil=Instant.now().plusSeconds(60);assertNull(trusted.restore(request));}
 @Test void logoutClearsCookieAndDeletesServerToken(){prepare();var response=new MockHttpServletResponse();trusted.revoke(request,response);assertTrue(response.getHeader("Set-Cookie").contains("Max-Age=0"));assertTrue(response.getHeader("Set-Cookie").contains("HttpOnly"));verify(db).update("DELETE FROM admin_trusted_devices WHERE token_hash=?",TrustedAdminDevices.hash("a".repeat(43)));}
}
