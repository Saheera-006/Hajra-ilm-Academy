package com.hajara.academy.portal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Request bodies for the portal API. Every field is length-limited and validated. */
public final class PortalDtos {

    private PortalDtos() {
    }

    public record Register(
        @NotBlank @Size(max = 150) String name,
        @Min(5) @Max(120) int age,
        @NotBlank @Email @Size(max = 190) String email,
        @NotBlank @Size(max = 30) String phone,
        @NotBlank @Size(min = 10, max = 72) String password) {
    }

    public record Login(
        @NotBlank @Size(max = 190) String identifier,
        @NotBlank @Size(max = 72) String password,
        @Size(max = 10) String portal) {
    }

    /** A 6-digit authenticator code, or an admin recovery code such as ABCDE-FGHIJ. */
    public record MfaCode(@NotBlank @Size(max = 32) String code) {
    }

    public record Checkout(
        @NotNull Long courseId,
        @NotNull @Pattern(regexp = "COURSE|MONTHLY|YEARLY") String plan,
        @NotNull @Pattern(regexp = "MANUAL|AUTOMATIC") String renewalMode) {
    }

    public record Renewal(@NotNull @Pattern(regexp = "MANUAL|AUTOMATIC") String renewalMode) {
    }

    public record CourseEdit(
        @NotBlank @Size(max = 180) String title,
        @Size(max = 2000) String description,
        @NotNull @DecimalMin("0.0") @DecimalMax("1000000") BigDecimal monthlyPrice,
        @NotNull @DecimalMin("0.0") @DecimalMax("10000000") BigDecimal yearlyPrice,
        @Size(max = 500) String meetUrl) {
    }

    public record AnnouncementEdit(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 5000) String body,
        Long batchId) {
    }

    public record AttendanceEdit(
        @NotNull Long enrollmentId,
        @NotNull LocalDate date,
        @NotNull @Pattern(regexp = "PRESENT|ABSENT|LATE|EXCUSED") String status) {
    }

    public record GrantAccess(
        @NotNull Long userId,
        @NotNull Long batchId) {
    }
}
