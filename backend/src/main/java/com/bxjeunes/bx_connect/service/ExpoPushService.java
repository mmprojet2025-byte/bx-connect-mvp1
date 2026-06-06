package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.PushDevice;
import com.bxjeunes.bx_connect.push.ExpoPushGateway;
import com.bxjeunes.bx_connect.push.ExpoPushResult;
import com.bxjeunes.bx_connect.repository.PushDeviceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExpoPushService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExpoPushService.class);
    private static final int MAX_ERROR_LENGTH = 500;

    private final PushDeviceRepository pushDeviceRepository;
    private final ExpoPushGateway expoPushGateway;

    public ExpoPushService(PushDeviceRepository pushDeviceRepository,
                           ExpoPushGateway expoPushGateway) {
        this.pushDeviceRepository = pushDeviceRepository;
        this.expoPushGateway = expoPushGateway;
    }

    @Transactional
    public void sendToUser(Long userId,
                           String title,
                           String body,
                           String type,
                           String actionUrl) {
        List<PushDevice> devices = pushDeviceRepository.findByUserIdAndEnabledTrue(userId);
        for (PushDevice device : devices) {
            sendToDevice(device, title, body, type, actionUrl);
        }
    }

    private void sendToDevice(PushDevice device,
                              String title,
                              String body,
                              String type,
                              String actionUrl) {
        try {
            ExpoPushResult result = expoPushGateway.send(
                    device.getExpoPushToken(),
                    title,
                    body,
                    type,
                    actionUrl
            );

            if (result.success()) {
                device.setLastError(null);
                device.setLastErrorAt(null);
                device.setLastSentAt(LocalDateTime.now());
            } else {
                recordFailure(device, result.errorCode(), result.errorMessage());
            }
        } catch (RuntimeException exception) {
            recordFailure(device, "UNEXPECTED_ERROR", exception.getMessage());
        }

        pushDeviceRepository.save(device);
    }

    private void recordFailure(PushDevice device, String errorCode, String errorMessage) {
        String message = errorCode + ": " +
                (errorMessage == null || errorMessage.isBlank() ? "Erreur push inconnue." : errorMessage);
        device.setLastError(message.substring(0, Math.min(message.length(), MAX_ERROR_LENGTH)));
        device.setLastErrorAt(LocalDateTime.now());

        if ("DeviceNotRegistered".equalsIgnoreCase(errorCode)) {
            device.setEnabled(false);
        }

        LOGGER.warn("Echec push Expo pour l'appareil {}: {}", device.getId(), message);
    }
}
