package com.bxjeunes.bx_connect.dto.superadmin;

import com.bxjeunes.bx_connect.entity.AuditLog;

import java.time.LocalDateTime;

public class AuditLogResponse {

    private Long id;
    private String acteurEmail;
    private String acteurRole;
    private String action;
    private String cibleType;
    private Long cibleId;
    private String cibleEmail;
    private String details;
    private LocalDateTime dateAction;

    public static AuditLogResponse fromEntity(AuditLog log) {
        AuditLogResponse response = new AuditLogResponse();
        response.id = log.getId();
        response.acteurEmail = log.getActeurEmail();
        response.acteurRole = log.getActeurRole();
        response.action = log.getAction();
        response.cibleType = log.getCibleType();
        response.cibleId = log.getCibleId();
        response.cibleEmail = log.getCibleEmail();
        response.details = log.getDetails();
        response.dateAction = log.getDateAction();
        return response;
    }

    public Long getId() { return id; }
    public String getActeurEmail() { return acteurEmail; }
    public String getActeurRole() { return acteurRole; }
    public String getAction() { return action; }
    public String getCibleType() { return cibleType; }
    public Long getCibleId() { return cibleId; }
    public String getCibleEmail() { return cibleEmail; }
    public String getDetails() { return details; }
    public LocalDateTime getDateAction() { return dateAction; }
}
