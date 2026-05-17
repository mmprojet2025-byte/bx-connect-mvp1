package com.bxjeunes.bx_connect.dto;

import com.bxjeunes.bx_connect.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String prenom;
    private String nom;
    private String email;
    private Role role;
}
