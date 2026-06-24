package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findTop50ByOrderByDateActionDesc();

    List<AuditLog> findByActionOrderByDateActionDesc(String action);

    List<AuditLog> findByCibleTypeOrderByDateActionDesc(String cibleType);

    List<AuditLog> findByActeurRoleOrderByDateActionDesc(String acteurRole);

    long countByActionIn(Collection<String> actions);

    List<AuditLog> findByDateActionBetweenOrderByDateActionDesc(
            LocalDateTime dateDebut,
            LocalDateTime dateFin);

    @Query("""
            SELECT log FROM AuditLog log
            WHERE (:action IS NULL OR log.action = :action)
              AND (:cibleType IS NULL OR log.cibleType = :cibleType)
              AND (:acteurRole IS NULL OR log.acteurRole = :acteurRole)
              AND (:dateDebut IS NULL OR log.dateAction >= :dateDebut)
              AND (:dateFin IS NULL OR log.dateAction <= :dateFin)
            ORDER BY log.dateAction DESC
            """)
    List<AuditLog> rechercher(
            @Param("action") String action,
            @Param("cibleType") String cibleType,
            @Param("acteurRole") String acteurRole,
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin);
}
