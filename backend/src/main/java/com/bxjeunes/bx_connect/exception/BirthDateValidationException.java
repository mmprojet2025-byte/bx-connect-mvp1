package com.bxjeunes.bx_connect.exception;

public class BirthDateValidationException extends IllegalArgumentException {

    private final String code;

    public BirthDateValidationException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
