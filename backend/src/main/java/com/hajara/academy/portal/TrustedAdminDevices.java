package com.hajara.academy.portal;

import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

/** Only minted after successful MFA; raw tokens never enter the database. */
@Service
public class TrustedAdminDevices {
 private static final String COOKIE="HIA_ADMIN_DEVICE";
 private final JdbcTemplate db;private final UserRepo users;private final boolean secure;
 public TrustedAdminDevices(JdbcTemplate db,UserRepo users,@Value("${server.servlet.session.cookie.secure:false}") boolean secure){this.db=db;this.users=users;this.secure=secure;}
 static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 private String token(HttpServletRequest r){if(r.getCookies()!=null)for(var c:r.getCookies())if(COOKIE.equals(c.getName())&&c.getValue().matches("[A-Za-z0-9_-]{43}"))return c.getValue();return null;}
 public PortalUser restore(HttpServletRequest r){String token=token(r);if(token==null)return null;var rows=db.queryForList("SELECT user_id,password_fingerprint FROM admin_trusted_devices WHERE token_hash=? AND expires_at>CURRENT_TIMESTAMP",hash(token));if(rows.isEmpty())return null;var row=rows.get(0);var u=users.findById(((Number)row.get("user_id")).longValue()).orElse(null);if(u==null||!"ADMIN".equals(u.role)||!u.mfaEnabled||(u.lockedUntil!=null&&u.lockedUntil.isAfter(Instant.now()))||!hash(u.passwordHash).equals(row.get("password_fingerprint")))return null;return u;}
 private void cookie(HttpServletResponse r,String token,long age){r.addHeader("Set-Cookie",ResponseCookie.from(COOKIE,token).path("/api/portal").httpOnly(true).secure(secure).sameSite("Strict").maxAge(age).build().toString());}
 public void issue(PortalUser u,HttpServletRequest request,HttpServletResponse response){revoke(request,response);db.update("DELETE FROM admin_trusted_devices WHERE expires_at<=CURRENT_TIMESTAMP");byte[] random=new byte[32];new SecureRandom().nextBytes(random);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(random);db.update("INSERT INTO admin_trusted_devices(token_hash,user_id,password_fingerprint,expires_at) VALUES(?,?,?,?)",hash(token),u.id,hash(u.passwordHash),java.sql.Timestamp.from(Instant.now().plus(Duration.ofDays(30))));cookie(response,token,30L*24*60*60);}
 public void revoke(HttpServletRequest request,HttpServletResponse response){String token=token(request);if(token!=null)db.update("DELETE FROM admin_trusted_devices WHERE token_hash=?",hash(token));cookie(response,"",0);}
}
