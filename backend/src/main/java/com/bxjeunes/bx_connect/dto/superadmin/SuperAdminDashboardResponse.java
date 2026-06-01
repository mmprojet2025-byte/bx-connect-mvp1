package com.bxjeunes.bx_connect.dto.superadmin;

import java.util.List;

public class SuperAdminDashboardResponse {

    private final long adminsActifs;
    private final long adminsInactifs;
    private final long totalActionsCritiques;
    private final List<AuditLogResponse> derniersLogs;

    public SuperAdminDashboardResponse(
            long adminsActifs,
            long adminsInactifs,
            long totalActionsCritiques,
            List<AuditLogResponse> derniersLogs) {
        this.adminsActifs = adminsActifs;
        this.adminsInactifs = adminsInactifs;
        this.totalActionsCritiques = totalActionsCritiques;
        this.derniersLogs = derniersLogs;
    }

    public long getAdminsActifs() { return adminsActifs; }
    public long getAdminsInactifs() { return adminsInactifs; }
    public long getTotalActionsCritiques() { return totalActionsCritiques; }
    public List<AuditLogResponse> getDerniersLogs() { return derniersLogs; }
}
