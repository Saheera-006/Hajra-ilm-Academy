-- Seed only facts the academy owner provided. Everything is editable in the admin CMS.
-- No admin user is seeded here; the first admin is provisioned via environment variables.
INSERT INTO role (name) VALUES ('SUPER_ADMIN'), ('ADMIN');

INSERT INTO course (title, title_ta, fee_paise, duration_months, class_days, start_time, end_time, mode, platform, language, certificate_note)
VALUES ('6-Month Beginner Islamic Learning Course', '6 மாத தொடக்க நிலை இஸ்லாமிய கல்விப் பாடநெறி', 300000, 6, 'MON,TUE,WED,THU', '19:00:00', '20:00:00',
        'Online', 'Google Meet', 'Tamil', 'Academy-issued course completion certificate');

INSERT INTO batch (course_id, name, capacity, status) VALUES (1, 'Batch 1', 20, 'OPEN');

-- Tamil names are a draft: the teacher should review them in the CMS.
INSERT INTO learning_area (course_id, name, name_ta, minutes_per_class, sort_order) VALUES
 (1, 'Quran Reading and Tajweed', 'குர்ஆன் ஓதுதலும் தஜ்வீதும்', 30, 1),
 (1, 'Islamic Studies', 'இஸ்லாமிய கல்வி', 30, 2),
 (1, 'Islamic History', 'இஸ்லாமிய வரலாறு', 30, 3);

-- Mon/Wed: Quran + Islamic Studies; Tue/Thu: Quran + Islamic History
INSERT INTO weekly_schedule (course_id, day_of_week, first_area_id, second_area_id) VALUES
 (1, 1, 1, 2), (1, 2, 1, 3), (1, 3, 1, 2), (1, 4, 1, 3);

-- Planning reference only: seeded UNPUBLISHED until the teacher approves the list and order.
INSERT INTO curriculum_topic (learning_area_id, title, sort_order, published) VALUES
 (1,'Arabic letters',1,FALSE),(1,'Makharij',2,FALSE),(1,'Sifaat',3,FALSE),(1,'Harakat',4,FALSE),
 (1,'Noon Sakinah and Tanween',5,FALSE),(1,'Meem Sakinah',6,FALSE),(1,'Madd rules',7,FALSE),
 (1,'Qalqalah',8,FALSE),(1,'Rules of Laam and Raa',9,FALSE),(1,'Idgham',10,FALSE),
 (1,'Ikhfa',11,FALSE),(1,'Izhar',12,FALSE),(1,'Iqlab',13,FALSE),(1,'Waqf and Ibtida',14,FALSE),
 (1,'Quran recitation practice',15,FALSE),(1,'Revision and assessment',16,FALSE);

INSERT INTO site_content (content_key, label, content_group, content_value_en) VALUES
 ('home.hero_title','Hero heading','home','HAJARA ILM ACADEMY'),
 ('home.hero_subtitle','Hero subtext','home','6-Month Beginner Islamic Learning Course, online in Tamil.'),
 ('home.hero_cta','Hero button label','home','Register Now'),
 ('home.bismillah','Bismillah (Arabic)','home','بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'),
 ('home.arabic_quote','Arabic quote (exact text as provided by the academy)','home','خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ'),
 ('home.arabic_quote_translation','Quote translation','home','The best among you are those who learn the Quran and teach it.'),
 ('home.arabic_quote_source','Quote source/reference (confirm before publishing)','home',NULL),
 ('home.intro','Academy introduction','home',NULL),
 ('about.academy_body','About Academy text','about',NULL),
 ('teacher.title','Teacher heading','teacher','Your Teacher'),
 ('teacher.qualifications','Qualifications (one per line)','teacher','Certified Aalima\nMuallama\nMuballiga'),
 ('teacher.experience','Experience','teacher','Four years of teaching experience'),
 ('contact.phone','Phone','contact',NULL),
 ('contact.whatsapp','WhatsApp number','contact',NULL),
 ('contact.email','Email','contact',NULL),
 ('contact.address','Address','contact',NULL),
 ('contact.instagram','Instagram URL','contact',NULL),
 ('contact.youtube','YouTube URL','contact',NULL),
 ('registration.closed_message','Message shown when registration is closed','registration','Registration is currently closed.'),
 ('legal.privacy','Privacy Policy text','legal',NULL),
 ('legal.terms','Terms and Conditions text','legal',NULL),
 ('legal.refund','Refund policy (to be decided by the academy)','legal',NULL),
 ('footer.text','Footer text','footer',NULL),
 ('seo.home_title','Home page title','seo','Hajara Ilm Academy'),
 ('seo.home_description','Home page description','seo',NULL);
