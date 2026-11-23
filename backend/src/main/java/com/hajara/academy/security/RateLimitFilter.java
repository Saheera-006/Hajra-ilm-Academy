package com.hajara.academy.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Per-IP fixed-window limiter for /api/**, with a much stricter limit for the login/registration endpoints.
 * Fine for a single instance. Behind a proxy, set server.forward-headers-strategy=framework so the
 * real client IP is used. Not registered as a @Component on purpose: it is added only to the security chain.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private static final int MAX_TRACKED_CLIENTS = 50_000;
    private static final String AUTH_PREFIX = "/api/portal/auth/";

    private static final class Window {
        final long start;
        final AtomicInteger count = new AtomicInteger();

        Window(long start) {
            this.start = start;
        }
    }

    private final Map<String, Window> general = new ConcurrentHashMap<>();
    private final Map<String, Window> auth = new ConcurrentHashMap<>();
    private final int generalLimit;
    private final int authLimit;

    public RateLimitFilter(int generalLimit, int authLimit) {
        this.generalLimit = generalLimit;
        this.authLimit = authLimit;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long now = System.currentTimeMillis();
        String client = request.getRemoteAddr();
        String path = request.getRequestURI();
        boolean authPath = !"GET".equalsIgnoreCase(request.getMethod())
            && (path.startsWith(AUTH_PREFIX) || path.startsWith("/api/portal/my-profile/"));

        boolean allowed = allow(general, client, generalLimit, now)
                && (!authPath || allow(auth, client, authLimit, now));
        if (!allowed) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests. Please try again shortly.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    private static boolean allow(Map<String, Window> windows, String key, int limit, long now) {
        if (windows.size() > MAX_TRACKED_CLIENTS) {
            windows.entrySet().removeIf(e -> now - e.getValue().start >= WINDOW_MS);
        }
        Window window = windows.compute(key,
                (k, old) -> old == null || now - old.start >= WINDOW_MS ? new Window(now) : old);
        return window.count.incrementAndGet() <= limit;
    }
}
