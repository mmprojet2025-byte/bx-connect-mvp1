package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.PushDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PushDeviceRepository extends JpaRepository<PushDevice, Long> {

    Optional<PushDevice> findByExpoPushToken(String expoPushToken);

    Optional<PushDevice> findByExpoPushTokenAndUserId(String expoPushToken, Long userId);

    List<PushDevice> findByUserId(Long userId);

    long countByUserId(Long userId);

    long countByUserIdAndEnabledTrue(Long userId);

    void deleteByExpoPushTokenAndUserId(String expoPushToken, Long userId);
}
