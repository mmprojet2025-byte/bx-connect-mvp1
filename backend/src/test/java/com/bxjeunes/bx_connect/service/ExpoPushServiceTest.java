package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.PushDevice;
import com.bxjeunes.bx_connect.push.ExpoPushGateway;
import com.bxjeunes.bx_connect.push.ExpoPushResult;
import com.bxjeunes.bx_connect.repository.PushDeviceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExpoPushServiceTest {

    @Mock private PushDeviceRepository pushDeviceRepository;
    @Mock private ExpoPushGateway expoPushGateway;

    @Test
    void envoie_uniquement_aux_appareils_actives() {
        PushDevice device = device("ExponentPushToken[active]");
        when(pushDeviceRepository.findByUserIdAndEnabledTrue(12L)).thenReturn(List.of(device));
        when(expoPushGateway.send(
                device.getExpoPushToken(),
                "Titre",
                "Message",
                "SYSTEME",
                "/dashboard"
        )).thenReturn(ExpoPushResult.delivered());

        new ExpoPushService(pushDeviceRepository, expoPushGateway)
                .sendToUser(12L, "Titre", "Message", "SYSTEME", "/dashboard");

        verify(pushDeviceRepository).findByUserIdAndEnabledTrue(12L);
        verify(pushDeviceRepository).save(device);
        assertThat(device.getLastSentAt()).isNotNull();
        assertThat(device.getLastError()).isNull();
    }

    @Test
    void une_erreur_expo_est_enregistree_sans_etre_propagee() {
        PushDevice device = device("ExponentPushToken[failure]");
        when(pushDeviceRepository.findByUserIdAndEnabledTrue(12L)).thenReturn(List.of(device));
        when(expoPushGateway.send(
                device.getExpoPushToken(),
                "Titre",
                "Message",
                "SYSTEME",
                null
        )).thenThrow(new RuntimeException("Expo indisponible"));

        ExpoPushService service = new ExpoPushService(pushDeviceRepository, expoPushGateway);

        assertThatCode(() -> service.sendToUser(12L, "Titre", "Message", "SYSTEME", null))
                .doesNotThrowAnyException();

        ArgumentCaptor<PushDevice> captor = ArgumentCaptor.forClass(PushDevice.class);
        verify(pushDeviceRepository).save(captor.capture());
        assertThat(captor.getValue().getLastError()).contains("Expo indisponible");
        assertThat(captor.getValue().getLastErrorAt()).isNotNull();
        assertThat(captor.getValue().isEnabled()).isTrue();
    }

    @Test
    void un_token_non_enregistre_est_desactive() {
        PushDevice device = device("ExponentPushToken[expired]");
        when(pushDeviceRepository.findByUserIdAndEnabledTrue(12L)).thenReturn(List.of(device));
        when(expoPushGateway.send(
                device.getExpoPushToken(),
                "Titre",
                "Message",
                "SYSTEME",
                null
        )).thenReturn(ExpoPushResult.failure("DeviceNotRegistered", "Token expire"));

        new ExpoPushService(pushDeviceRepository, expoPushGateway)
                .sendToUser(12L, "Titre", "Message", "SYSTEME", null);

        assertThat(device.isEnabled()).isFalse();
        assertThat(device.getLastError()).contains("DeviceNotRegistered");
    }

    private PushDevice device(String token) {
        return PushDevice.builder()
                .id(1L)
                .expoPushToken(token)
                .platform("ios")
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
