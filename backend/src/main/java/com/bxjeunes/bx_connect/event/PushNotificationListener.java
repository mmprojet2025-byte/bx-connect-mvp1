package com.bxjeunes.bx_connect.event;

import com.bxjeunes.bx_connect.service.ExpoPushService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class PushNotificationListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(PushNotificationListener.class);

    private final ExpoPushService expoPushService;

    public PushNotificationListener(ExpoPushService expoPushService) {
        this.expoPushService = expoPushService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPushNotification(PushNotificationEvent event) {
        try {
            expoPushService.sendToUser(
                    event.userId(),
                    event.title(),
                    event.body(),
                    event.type(),
                    event.actionUrl()
            );
        } catch (RuntimeException exception) {
            LOGGER.error("L'envoi push a echoue sans interrompre l'action metier.", exception);
        }
    }
}
