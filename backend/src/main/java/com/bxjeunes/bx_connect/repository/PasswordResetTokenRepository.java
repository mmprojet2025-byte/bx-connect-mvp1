package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.PasswordResetToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT token FROM PasswordResetToken token JOIN FETCH token.user "
            + "WHERE token.tokenHash = :tokenHash AND token.usedAt IS NULL")
    Optional<PasswordResetToken> findActiveForUpdate(@Param("tokenHash") String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PasswordResetToken token SET token.usedAt = :usedAt "
            + "WHERE token.user.id = :userId AND token.usedAt IS NULL")
    int invalidateActiveTokens(@Param("userId") Long userId, @Param("usedAt") LocalDateTime usedAt);
}
