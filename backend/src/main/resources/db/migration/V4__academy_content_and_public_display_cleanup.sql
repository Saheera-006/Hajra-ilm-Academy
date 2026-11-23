-- Align public content with the academy details confirmed by the owner.
-- Do not publish unconfirmed fees, durations, timings, platform, certificates or educator credentials.
UPDATE course
SET title = 'Islamic Learning Programme',
    title_ta = 'இஸ்லாமியக் கல்விப் பாடத்திட்டம்',
    description = 'Live online Islamic learning for women and girls. Lessons are taught in Tamil.',
    description_ta = 'பெண்கள் மற்றும் மாணவிகளுக்கான நேரடி இணையவழி இஸ்லாமியக் கல்வி வகுப்புகள் தமிழில் நடத்தப்படும்.',
    fee_paise = 0,
    duration_months = 0,
    class_days = '',
    start_time = '00:00:00',
    end_time = '00:00:00',
    mode = 'Live online',
    platform = NULL,
    language = 'Tamil',
    certificate_note = NULL,
    certificate_note_ta = NULL,
    title_ar = NULL,
    level = NULL,
    short_description = 'Structured online learning in Quran reading, Tajweed and essential Islamic knowledge.',
    short_description_ta = 'குர்ஆன் ஓதுதல், தஜ்வீத் மற்றும் அடிப்படை இஸ்லாமிய அறிவுக்கான ஒழுங்குபடுத்தப்பட்ட இணையவழிக் கற்றல்.';

-- Registration is not yet implemented. Keep the batch closed until the registration flow is ready.
UPDATE batch SET capacity = 0, status = 'CLOSED';

UPDATE site_content SET content_value_en = 'Knowledge That Nurtures Faith.' WHERE content_key = 'home.hero_title';
UPDATE site_content SET content_value_en = 'An online space for women and girls to learn the Quran and essential Islamic knowledge from home.' WHERE content_key = 'home.hero_subtitle';
UPDATE site_content SET content_value_en = 'Explore curriculum' WHERE content_key = 'home.hero_cta';
UPDATE site_content SET content_value_en = 'Our purpose is to make Islamic learning more accessible to women and girls who wish to gain knowledge but are unable to attend a madrasa in person.' WHERE content_key = 'home.intro';
UPDATE site_content SET content_value_en = 'Hajara Ilm Academy is an online learning initiative for women and girls who wish to learn Islam from home. Lessons are conducted live and taught in Tamil.' WHERE content_key = 'about.academy_body';
UPDATE site_content SET content_value_en = 'Our Educator' WHERE content_key = 'teacher.title';

-- These fields were sample placeholders, not verified educator information.
UPDATE site_content
SET content_value_en = NULL, content_value_ta = NULL
WHERE content_key IN (
  'teacher.name', 'teacher.photo_url', 'teacher.designations',
  'teacher.qualifications', 'teacher.experience', 'teacher.specialization', 'teacher.bio'
);
