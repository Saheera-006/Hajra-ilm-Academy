package com.hajara.academy.portal;

import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class RazorpayProxyTest {
 @Test void proxyDelegatesToInitializedService() {
  JdbcTemplate db=mock(JdbcTemplate.class);
  RazorpayService target=new RazorpayService(db,null,null);
  ReflectionTestUtils.setField(target,"secret","checkout-test");
  ReflectionTestUtils.setField(target,"webhookSecret","webhook-test");
  ProxyFactory factory=new ProxyFactory(target);
  factory.setProxyTargetClass(true);
  RazorpayService proxy=(RazorpayService)factory.getProxy();
  assertSame(db,proxy.getDb());
  assertSame(target.getJson(),proxy.getJson());
  byte[] checkout="order_abc|pay_xyz".getBytes(StandardCharsets.UTF_8);
  byte[] webhook="{\"event\":\"payment.captured\"}".getBytes(StandardCharsets.UTF_8);
  assertTrue(proxy.verifyCheckoutSignature("order_abc","pay_xyz",sign("checkout-test",checkout)));
  assertTrue(proxy.verifyWebhookSignature(webhook,sign("webhook-test",webhook)));
  assertFalse(proxy.verifyCheckoutSignature("order_abc","pay_other",sign("checkout-test",checkout)));
  assertFalse(proxy.verifyWebhookSignature(webhook,sign("checkout-test",webhook)));
 }
 private static String sign(String key,byte[] body){
  try {var mac=javax.crypto.Mac.getInstance("HmacSHA256");mac.init(new javax.crypto.spec.SecretKeySpec(key.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));return java.util.HexFormat.of().formatHex(mac.doFinal(body));}catch(Exception e){throw new AssertionError(e);}
 }
}
