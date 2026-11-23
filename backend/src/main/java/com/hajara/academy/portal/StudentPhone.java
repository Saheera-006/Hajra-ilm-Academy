package com.hajara.academy.portal;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class StudentPhone {
    private StudentPhone() {}

    static String normalize(String input) {
        String phone = input.replaceAll("[ ()-]", "");
        // Treat local Indian mobile numbers and their +91 equivalent as the same number.
        if (phone.matches("[6-9][0-9]{9}")) phone = "+91" + phone;
        if (!phone.matches("\\+?[0-9]{7,15}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid phone number with 7 to 15 digits.");
        }
        return phone;
    }
}
