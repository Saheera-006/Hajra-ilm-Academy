package com.hajara.academy.portal;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.springframework.security.core.Authentication;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
class LessonNotificationTest {
 final AcademyLessonRepo lessons=mock(AcademyLessonRepo.class);
 final AcademyNotificationRepo notices=mock(AcademyNotificationRepo.class);
 final BatchService batches=mock(BatchService.class);
 final UserRepo users=mock(UserRepo.class); final CurrentUser current=mock(CurrentUser.class);
 final Authentication auth=mock(Authentication.class);
 final MockHttpServletRequest request=new MockHttpServletRequest();
 final AcademyManagementController c=new AcademyManagementController(new StudentPush(mock(org.springframework.jdbc.core.JdbcTemplate.class), ""),mock(AcademyTeacherRepo.class),lessons,mock(AcademyCertificateRepo.class),mock(AcademySiteContentRepo.class),notices,mock(CourseRepo.class),mock(EnrollmentRepo.class),mock(PaymentRepo.class),users,current,mock(AuditLog.class),batches,mock(org.springframework.jdbc.core.JdbcTemplate.class));
 void admin(){var u=new PortalUser();u.id=1L;u.role="ADMIN";when(current.require(auth)).thenReturn(u);when(notices.save(any())).thenAnswer(i->{AcademyNotification n=i.getArgument(0);n.id=1L;return n;});when(lessons.save(any())).thenAnswer(i->i.getArgument(0));}
 AcademyNotification notice(String id){var n=new AcademyNotification();n.studentId=id;n.title="Class";n.message="Starts today";return n;}
 @Test void invalidStudentIdIsNotBroadcast(){when(users.findAll()).thenReturn(List.of());assertEquals(400,assertThrows(ResponseStatusException.class,()->c.notify(auth,request,notice("HIA-NOT-FOUND"))).getStatusCode().value());verify(notices,never()).save(any());}
 @Test void recipientUsesHiaIdentifierNotInternalNumber(){admin();var s=new PortalUser();s.id=42L;s.studentNumber="HIA202601001";when(users.findAll()).thenReturn(List.of(s));var result=notice(" hia202601001 ");c.notify(auth,request,result);assertEquals(42L,result.userId);assertEquals("HIA202601001",result.studentId);}
 @Test void blankStudentIdIsExplicitBroadcast(){admin();var n=notice(" ");n.userId=99L;c.notify(auth,request,n);assertNull(n.userId);assertNull(n.studentId);}
 @Test void batchNotificationStoresItsAudience() {
     admin();
     var notice = notice(null);
     notice.batchId = 7L;
     c.notify(auth, request, notice);
     verify(batches).get(7L);
     verify(notices).save(argThat(saved -> Long.valueOf(7L).equals(saved.batchId) && saved.userId == null));
 }
 @Test void batchAndStudentCannotBeCombined() {
     var notice = notice("HIA202601001");
     notice.batchId = 7L;
     assertEquals(400, assertThrows(ResponseStatusException.class,
         () -> c.notify(auth, request, notice)).getStatusCode().value());
     verify(notices, never()).save(any());
 }
 @Test void lessonRequiresOneOfFourAreas(){var l=new AcademyLesson();l.title="Lesson";l.learningArea="other";assertEquals(400,assertThrows(ResponseStatusException.class,()->c.lesson(auth,request,l)).getStatusCode().value());verify(lessons,never()).save(any());}
 @Test void validLessonDropsLegacyCourseMapping(){admin();var l=new AcademyLesson();l.title="Lesson";l.learningArea="history";l.courseId=123L;assertNull(c.lesson(auth,request,l).courseId);}
}
