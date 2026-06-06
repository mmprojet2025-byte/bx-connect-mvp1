package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.PushDeviceRequest;
import com.bxjeunes.bx_connect.entity.PushDevice;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.PushDeviceRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.PushDeviceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PushDeviceServiceTest {

    @Mock private PushDeviceRepository pushDeviceRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private PushDeviceService pushDeviceService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(7L);
        user.setEmail("membre@test.be");
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }

    @Test
    @DisplayName("Un token push est toujours rattache a l'utilisateur connecte")
    void token_est_rattache_utilisateur_connecte() {
        PushDeviceRequest request = request("ExponentPushToken[token-user]");
        when(pushDeviceRepository.findByExpoPushToken(request.getExpoPushToken()))
                .thenReturn(Optional.empty());
        when(pushDeviceRepository.save(any(PushDevice.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        pushDeviceService.enregistrerAppareil(user.getEmail(), request);

        verify(pushDeviceRepository).save(argThat(device ->
                device.getUser().getId().equals(user.getId())
                        && device.getExpoPushToken().equals(request.getExpoPushToken())
                        && device.isEnabled()
        ));
    }

    @Test
    @DisplayName("Un utilisateur ne peut pas reutiliser le token d'un autre utilisateur")
    void token_autre_utilisateur_est_refuse() {
        User other = new User();
        other.setId(99L);
        PushDevice existing = PushDevice.builder()
                .user(other)
                .expoPushToken("ExponentPushToken[other]")
                .platform("ios")
                .build();
        when(pushDeviceRepository.findByExpoPushToken(existing.getExpoPushToken()))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(() ->
                pushDeviceService.enregistrerAppareil(
                        user.getEmail(),
                        request(existing.getExpoPushToken())
                ))
                .isInstanceOf(AccessDeniedException.class);

        verify(pushDeviceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Un utilisateur ne peut supprimer que son propre token")
    void suppression_token_autre_utilisateur_est_refusee() {
        when(pushDeviceRepository.findByExpoPushTokenAndUserId("ExponentPushToken[other]", user.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                pushDeviceService.supprimerAppareil(
                        user.getEmail(),
                        "ExponentPushToken[other]"
                ))
                .isInstanceOf(AccessDeniedException.class);

        verify(pushDeviceRepository, never()).deleteByExpoPushTokenAndUserId(anyString(), anyLong());
    }

    @Test
    @DisplayName("La preference push ne modifie que les appareils de l'utilisateur connecte")
    void preference_ne_modifie_que_les_appareils_connectes() {
        PushDevice first = PushDevice.builder().user(user).enabled(true).build();
        PushDevice second = PushDevice.builder().user(user).enabled(true).build();
        when(pushDeviceRepository.findByUserId(user.getId())).thenReturn(List.of(first, second));
        when(pushDeviceRepository.countByUserId(user.getId())).thenReturn(2L);
        when(pushDeviceRepository.countByUserIdAndEnabledTrue(user.getId())).thenReturn(0L);

        var response = pushDeviceService.mettreAJourPreferences(user.getEmail(), false);

        assertThat(first.isEnabled()).isFalse();
        assertThat(second.isEnabled()).isFalse();
        assertThat(response.enabled()).isFalse();
        verify(pushDeviceRepository, times(2)).save(any(PushDevice.class));
        verify(pushDeviceRepository).findByUserId(user.getId());
    }

    private PushDeviceRequest request(String token) {
        PushDeviceRequest request = new PushDeviceRequest();
        request.setExpoPushToken(token);
        request.setPlatform("ios");
        request.setDeviceId("device-test");
        request.setEnabled(true);
        return request;
    }
}
