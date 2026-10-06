package com.bxjeunes.bx_connect.repository;
import com.bxjeunes.bx_connect.entity.ProjetParticipationPaiement;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface ProjetParticipationPaiementRepository extends JpaRepository<ProjetParticipationPaiement, Long> {
    List<ProjetParticipationPaiement> findByMembreIdOrderByDateCreationDesc(Long id);
    List<ProjetParticipationPaiement> findByProjetIdOrderByDateCreationDesc(Long id);
    Optional<ProjetParticipationPaiement> findByStripeSessionId(String id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProjetParticipationPaiement p WHERE p.id = :id")
    Optional<ProjetParticipationPaiement> findByIdForUpdate(@Param("id") Long id);
}
