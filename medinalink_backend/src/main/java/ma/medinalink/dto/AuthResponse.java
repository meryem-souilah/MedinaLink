package ma.medinalink.dto;

import java.util.UUID;

public class AuthResponse {

    private String token;
    private UUID userId;
    private String email;
    private String fullName;
    private String role;

    // Constructeur avec tous les paramètres
    public AuthResponse(String token, UUID userId, String email, String fullName, String role) {
        this.token = token;
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
    }

    // Getters
    public String getToken() { return token; }
    public UUID getUserId() { return userId; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getRole() { return role; }

    // Setters
    public void setToken(String token) { this.token = token; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public void setEmail(String email) { this.email = email; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setRole(String role) { this.role = role; }
}