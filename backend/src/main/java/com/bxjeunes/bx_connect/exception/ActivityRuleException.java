package com.bxjeunes.bx_connect.exception;

/** Business failures only. Clients receive a stable code, never Java exception details. */
public class ActivityRuleException extends IllegalArgumentException {
    private final String code;
    public ActivityRuleException(String code, String message) {
        super(message);
        this.code = code;
    }
    public ActivityRuleException(String message) {
        super(message);
        String text = message.toLowerCase(java.util.Locale.ROOT);
        code = text.contains("paiement") ? "PAYMENT"
                : text.contains("prix") || text.contains("tarif") || text.contains("payante") ? "PRICE"
                : text.contains("image") ? "IMAGE"
                : text.contains("capacité") || text.contains("complète") ? "CAPACITY"
                : text.contains("clôtur") || text.contains("limite") ? "DEADLINE"
                : text.contains("groupe") || text.contains("référent") ? "GROUP"
                : text.contains("date") || text.contains("début") || text.contains("fin ") ? "DATES"
                : "UNAVAILABLE";
    }
    public String getCode() { return code; }
}
