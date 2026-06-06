package com.bxjeunes.bx_connect.push;

public interface ExpoPushGateway {

    ExpoPushResult send(String expoPushToken,
                        String title,
                        String body,
                        String type,
                        String actionUrl);
}
