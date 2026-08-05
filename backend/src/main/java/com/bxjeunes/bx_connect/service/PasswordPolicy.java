package com.bxjeunes.bx_connect.service;

public final class PasswordPolicy {

    private PasswordPolicy() {
    }

    public static void validate(String password) {
        if (password == null || password.length() < 12 || password.length() > 128
                || password.chars().noneMatch(Character::isUpperCase)
                || password.chars().noneMatch(Character::isLowerCase)
                || password.chars().noneMatch(Character::isDigit)
                || password.chars().noneMatch(character -> !Character.isLetterOrDigit(character))) {
            throw new IllegalArgumentException(
                    "Le mot de passe doit contenir entre 12 et 128 caracteres, "
                            + "avec une majuscule, une minuscule, un chiffre et un caractere special.");
        }
    }
}
