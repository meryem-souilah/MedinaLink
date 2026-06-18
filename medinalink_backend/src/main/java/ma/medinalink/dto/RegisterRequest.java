package ma.medinalink.dto;

import java.util.UUID;

public class RegisterRequest {

    private String email;
    private String password;
    private String fullName;
    private UUID communeId;

    // Getters
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getFullName() { return fullName; }
    public UUID getCommuneId() { return communeId; }

    // Setters
    public void setEmail(String email) { this.email = email; }
    public void setPassword(String password) { this.password = password; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setCommuneId(UUID communeId) { this.communeId = communeId; }
}