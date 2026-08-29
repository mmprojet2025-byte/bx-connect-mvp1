package com.bxjeunes.bx_connect.dto.superadmin;

import com.bxjeunes.bx_connect.entity.AuditLog;

import java.time.LocalDateTime;

public class AuditLogResponse {

    private Long id;
    private String acteurRole;
    private String action;
    private String cibleType;
    private LocalDateTime dateAction;

    public static AuditLogResponse fromEntity(AuditLog log) {
        AuditLogResponse response = new AuditLogResponse();
        response.id = log.getId();
        response.acteurRole = log.getActeurRole();
        response.action = log.getAction();
        response.cibleType = log.getCibleType();
        response.dateAction = log.getDateAction();
        return response;
    }

    public Long getId() { return id; }
    public String getActeurRole() { return acteurRole; }
    public String getAction() { return action; }
    public String getCibleType() { return cibleType; }
    public LocalDateTime getDateAction() { return dateAction; }
}
