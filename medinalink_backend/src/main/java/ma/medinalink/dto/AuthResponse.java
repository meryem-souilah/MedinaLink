package ma.medinalink.dto;

import java.util.UUID;

public class AuthResponse {

    private String token;
    private UUID userId;
    private String email;
    private String fullName;
    private String role;
    private String secteur;
    private String agentCategories;
    private String city;

    public AuthResponse(String token, UUID userId, String email, String fullName, String role,
                        String secteur, String agentCategories, String city) {
        this.token            = token;
        this.userId           = userId;
        this.email            = email;
        this.fullName         = fullName;
        this.role             = role;
        this.secteur          = secteur;
        this.agentCategories  = agentCategories;
        this.city             = city;
    }

    public String getToken()           { return token; }
    public UUID getUserId()            { return userId; }
    public String getEmail()           { return email; }
    public String getFullName()        { return fullName; }
    public String getRole()            { return role; }
    public String getSecteur()         { return secteur; }
    public String getAgentCategories() { return agentCategories; }

    public void setToken(String token)                       { this.token = token; }
    public void setUserId(UUID userId)                       { this.userId = userId; }
    public void setEmail(String email)                       { this.email = email; }
    public void setFullName(String fullName)                 { this.fullName = fullName; }
    public void setRole(String role)                         { this.role = role; }
    public void setSecteur(String secteur)                   { this.secteur = secteur; }
    public void setAgentCategories(String agentCategories)   { this.agentCategories = agentCategories; }
    public String getCity()               { return city; }
    public void setCity(String city)      { this.city = city; }
}
