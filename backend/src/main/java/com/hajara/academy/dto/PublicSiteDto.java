package com.hajara.academy.dto;

import java.util.List;
import java.util.Map;

/** Everything the public website needs, in one read-only payload. No private data. */
public record PublicSiteDto(
        CourseDto course,
        BatchDto batch,
        List<AreaDto> learningAreas,
        List<ScheduleDto> schedule,
        List<FaqDto> faqs,
        List<AnnouncementDto> announcements,
        Map<String, LocalizedText> content) {

    public record LocalizedText(String en, String ta) {}

    public record CourseDto(String title, String titleTa, String description, String descriptionTa,
                            int feeRupees, int durationMonths, String classDays, String startTime,
                            String endTime, String mode, String platform, String language,
                            String certificateNote, String certificateNoteTa, String titleAr,
                            String level, String shortDescription, String shortDescriptionTa,
                            String imageUrl) {}

    public record BatchDto(String name, String startDate, int capacity, int seatsAvailable,
                           boolean registrationOpen) {}

    public record TopicDto(long id, String title, String titleTa, String titleAr, String description) {}

    public record AreaDto(long id, String name, String nameTa, String description,
                          Integer minutesPerClass, List<TopicDto> topics) {}

    public record ScheduleDto(int dayOfWeek, long firstAreaId, Long secondAreaId) {}

    public record FaqDto(long id, String question, String questionTa, String answer, String answerTa) {}

    public record AnnouncementDto(long id, String title, String titleTa, String body, String bodyTa) {}
}
