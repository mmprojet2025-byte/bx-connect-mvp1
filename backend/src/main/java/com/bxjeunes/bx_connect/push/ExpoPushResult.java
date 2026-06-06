package com.bxjeunes.bx_connect.push;

public record ExpoPushResult(boolean success, String errorCode, String errorMessage) {

    public static ExpoPushResult delivered() {
        return new ExpoPushResult(true, null, null);
    }

    public static ExpoPushResult failure(String errorCode, String errorMessage) {
        return new ExpoPushResult(false, errorCode, errorMessage);
    }
}
