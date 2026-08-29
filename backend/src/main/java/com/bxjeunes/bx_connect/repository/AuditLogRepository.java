package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    @Query("""
            SELECT COUNT(log) FROM AuditLog log
            WHERE log.cibleType = :cibleType
              AND ((log.acteurRole = :superAdminRole AND log.action IN :adminActions)
                OR (log.acteurRole = :systemRole AND log.action = :bootstrapAction))
            """)
    long countTechnicalLogs(
            @Param("adminActions") Collection<String> adminActions,
            @Param("bootstrapAction") String bootstrapAction,
            @Param("cibleType") String cibleType,
            @Param("superAdminRole") String superAdminRole,
            @Param("systemRole") String systemRole);

    List<AuditLog> findByDateActionBetweenOrderByDateActionDesc(
            LocalDateTime dateDebut,
            LocalDateTime dateFin);

    @Query(
            value = """
                    SELECT log FROM AuditLog log
                    WHERE log.cibleType = :technicalCibleType
                      AND ((log.acteurRole = :superAdminRole AND log.action IN :adminActions)
                        OR (log.acteurRole = :systemRole AND log.action = :bootstrapAction))
                      AND (:action IS NULL OR log.action = :action)
                      AND (:cibleType IS NULL OR log.cibleType = :cibleType)
                      AND (:acteurRole IS NULL OR log.acteurRole = :acteurRole)
                      AND (:dateDebut IS NULL OR log.dateAction >= :dateDebut)
                      AND (:dateFin IS NULL OR log.dateAction <= :dateFin)
                    """,
            countQuery = """
                    SELECT COUNT(log) FROM AuditLog log
                    WHERE log.cibleType = :technicalCibleType
                      AND ((log.acteurRole = :superAdminRole AND log.action IN :adminActions)
                        OR (log.acteurRole = :systemRole AND log.action = :bootstrapAction))
                      AND (:action IS NULL OR log.action = :action)
                      AND (:cibleType IS NULL OR log.cibleType = :cibleType)
                      AND (:acteurRole IS NULL OR log.acteurRole = :acteurRole)
                      AND (:dateDebut IS NULL OR log.dateAction >= :dateDebut)
                      AND (:dateFin IS NULL OR log.dateAction <= :dateFin)
                    """
    )
    Page<AuditLog> rechercherTechnicalLogs(
            @Param("adminActions") Collection<String> adminActions,
            @Param("bootstrapAction") String bootstrapAction,
            @Param("technicalCibleType") String technicalCibleType,
            @Param("superAdminRole") String superAdminRole,
            @Param("systemRole") String systemRole,
            @Param("action") String action,
            @Param("cibleType") String cibleType,
            @Param("acteurRole") String acteurRole,
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin,
            Pageable pageable);
}
