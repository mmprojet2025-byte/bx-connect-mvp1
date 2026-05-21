package com.bxjeunes.bx_connect.entity;

public enum StatutGroupe {
    EN_ATTENTE,  // Proposé par le référent, en attente de validation admin
    VALIDE,      // Validé par l'admin, visible publiquement
    REFUSE,      // Refusé par l'admin
    ARCHIVE      // Archivé (inactif mais conservé)
}