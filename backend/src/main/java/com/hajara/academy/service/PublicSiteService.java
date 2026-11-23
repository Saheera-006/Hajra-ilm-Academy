package com.hajara.academy.service;

import com.hajara.academy.dto.PublicSiteDto;
import com.hajara.academy.dto.PublicSiteDto.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Read-only queries for the public site. All SQL uses bound parameters.
 * Only published rows are returned; empty CMS values are left out so the UI can hide them.
 */
@Service
public class PublicSiteService {

    private final JdbcClient jdbc;

    public PublicSiteService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public PublicSiteDto load() {
        CourseRow row = jdbc.sql("""
                SELECT id, title, title_ta, description, description_ta, fee_paise, duration_months,
                       class_days, start_time, end_time, mode, platform, language,
                       certificate_note, certificate_note_ta, title_ar, level,
                       short_description, short_description_ta, image_url
                FROM course WHERE active = TRUE ORDER BY id LIMIT 1""")
                .query((rs, i) -> new CourseRow(rs.getLong("id"),
                        new CourseDto(rs.getString("title"), rs.getString("title_ta"),
                                rs.getString("description"), rs.getString("description_ta"),
                                rs.getInt("fee_paise") / 100, rs.getInt("duration_months"),
                                rs.getString("class_days"), rs.getString("start_time"),
                                rs.getString("end_time"), rs.getString("mode"),
                                rs.getString("platform"), rs.getString("language"),
                                rs.getString("certificate_note"), rs.getString("certificate_note_ta"),
                                rs.getString("title_ar"), rs.getString("level"),
                                rs.getString("short_description"), rs.getString("short_description_ta"),
                                rs.getString("image_url"))))
                .optional().orElse(null);

        if (row == null) {
            return new PublicSiteDto(null, null, List.of(), List.of(), List.of(), List.of(), content());
        }
        long courseId = row.id();
        return new PublicSiteDto(row.course(), batch(courseId), areas(courseId),
                schedule(courseId), faqs(), announcements(), content());
    }

    private record CourseRow(long id, CourseDto course) {}

    private BatchDto batch(long courseId) {
        record BatchRow(long id, String name, String startDate, int capacity, String status) {}
        BatchRow row = jdbc.sql("""
                SELECT id, name, start_date, capacity, status FROM batch
                WHERE course_id = :c ORDER BY id DESC LIMIT 1""")
                .param("c", courseId)
                .query((rs, i) -> new BatchRow(rs.getLong("id"), rs.getString("name"),
                        rs.getString("start_date"), rs.getInt("capacity"), rs.getString("status")))
                .optional().orElse(null);
        if (row == null) {
            return null;
        }
        // A seat is taken by a confirmed registration or an unexpired payment hold.
        int taken = jdbc.sql("""
                SELECT COUNT(*) FROM registration WHERE batch_id = :b
                  AND (status = 'CONFIRMED' OR (status = 'PENDING' AND hold_expires_at > NOW()))""")
                .param("b", row.id()).query(Integer.class).single();
        int available = Math.max(0, row.capacity() - taken);
        boolean open = "OPEN".equals(row.status()) && available > 0;
        return new BatchDto(row.name(), row.startDate(), row.capacity(), available, open);
    }

    private List<AreaDto> areas(long courseId) {
        Map<Long, List<TopicDto>> topicsByArea = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT t.id, t.learning_area_id, t.title, t.title_ta, t.title_ar, t.description
                FROM curriculum_topic t JOIN learning_area a ON a.id = t.learning_area_id
                WHERE t.published = TRUE AND a.course_id = :c
                ORDER BY t.sort_order, t.id""")
                .param("c", courseId)
                .query((rs, i) -> {
                    topicsByArea.computeIfAbsent(rs.getLong("learning_area_id"), k -> new ArrayList<>())
                            .add(new TopicDto(rs.getLong("id"), rs.getString("title"),
                                    rs.getString("title_ta"), rs.getString("title_ar"),
                                    rs.getString("description")));
                    return null;
                }).list();

        return jdbc.sql("""
                SELECT id, name, name_ta, description, minutes_per_class FROM learning_area
                WHERE course_id = :c AND published = TRUE ORDER BY sort_order, id""")
                .param("c", courseId)
                .query((rs, i) -> {
                    long id = rs.getLong("id");
                    Integer minutes = rs.getObject("minutes_per_class", Integer.class);
                    return new AreaDto(id, rs.getString("name"), rs.getString("name_ta"),
                            rs.getString("description"), minutes,
                            topicsByArea.getOrDefault(id, List.of()));
                }).list();
    }

    private List<ScheduleDto> schedule(long courseId) {
        return jdbc.sql("""
                SELECT day_of_week, first_area_id, second_area_id FROM weekly_schedule
                WHERE course_id = :c AND published = TRUE ORDER BY day_of_week""")
                .param("c", courseId)
                .query((rs, i) -> new ScheduleDto(rs.getInt("day_of_week"), rs.getLong("first_area_id"),
                        rs.getObject("second_area_id", Long.class))).list();
    }

    private List<FaqDto> faqs() {
        return jdbc.sql("""
                SELECT id, question, question_ta, answer, answer_ta FROM faq
                WHERE published = TRUE ORDER BY sort_order, id""")
                .query((rs, i) -> new FaqDto(rs.getLong("id"), rs.getString("question"),
                        rs.getString("question_ta"), rs.getString("answer"), rs.getString("answer_ta")))
                .list();
    }

    private List<AnnouncementDto> announcements() {
        return jdbc.sql("""
                SELECT id, title, title_ta, body, body_ta FROM announcement
                WHERE published = TRUE
                  AND (publish_from IS NULL OR publish_from <= NOW())
                  AND (publish_to IS NULL OR publish_to >= NOW())
                ORDER BY id DESC""")
                .query((rs, i) -> new AnnouncementDto(rs.getLong("id"), rs.getString("title"),
                        rs.getString("title_ta"), rs.getString("body"), rs.getString("body_ta")))
                .list();
    }

    private Map<String, LocalizedText> content() {
        Map<String, LocalizedText> out = new LinkedHashMap<>();
        jdbc.sql("SELECT content_key, content_value_en, content_value_ta FROM site_content")
                .query((rs, i) -> {
                    String en = blankToNull(rs.getString("content_value_en"));
                    String ta = blankToNull(rs.getString("content_value_ta"));
                    if (en != null || ta != null) {
                        out.put(rs.getString("content_key"), new LocalizedText(en, ta));
                    }
                    return null;
                }).list();
        return out;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
