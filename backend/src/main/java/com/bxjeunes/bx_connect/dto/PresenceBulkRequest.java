package com.bxjeunes.bx_connect.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class PresenceBulkRequest {

    @NotEmpty
    @Valid
    private List<PresenceBulkItemRequest> presences;

    public List<PresenceBulkItemRequest> getPresences() {
        return presences;
    }

    public void setPresences(List<PresenceBulkItemRequest> presences) {
        this.presences = presences;
    }

    public static class PresenceBulkItemRequest extends PresenceRequest {
        private Long inscriptionId;

        public Long getInscriptionId() {
            return inscriptionId;
        }

        public void setInscriptionId(Long inscriptionId) {
            this.inscriptionId = inscriptionId;
        }
    }
}
