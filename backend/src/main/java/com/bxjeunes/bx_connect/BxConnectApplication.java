package com.bxjeunes.bx_connect;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BxConnectApplication {

    public static void main(String[] args) {
        SpringApplication.run(BxConnectApplication.class, args);
    }
}
