package ma.medinalink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role = Role.CITIZEN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commune_id")
    private Commune commune;

    @Column(name = "secteur", length = 150)
    private String secteur;

    @Column(name = "agent_latitude")
    private Double agentLatitude;

    @Column(name = "agent_longitude")
    private Double agentLongitude;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "is_active")
    private boolean isActive = true;

    // Catégories de signalements gérées par cet agent (comma-separated, ex: "ROAD,LIGHTING")
    // null ou vide = gère toutes les catégories
    @Column(name = "agent_categories", length = 500)
    private String agentCategories;

    @Column(name = "city", length = 100)
    private String city;

    // Constructeur vide (requis par JPA)
    public User() {}

    // Appelé automatiquement avant INSERT
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.role == null) {
            this.role = Role.CITIZEN;
        }
    }

    // Getters
    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getFullName() { return fullName; }
    public Role getRole() { return role; }
    public Commune getCommune() { return commune; }
    public String getSecteur() { return secteur; }
    public Double getAgentLatitude() { return agentLatitude; }
    public Double getAgentLongitude() { return agentLongitude; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public boolean isActive() { return isActive; }
    public String getAgentCategories() { return agentCategories; }
    public String getCity() { return city; }

    // Setters
    public void setId(UUID id) { this.id = id; }
    public void setEmail(String email) { this.email = email; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setRole(Role newRole) { this.role = newRole; }
    public void setCommune(Commune commune) { this.commune = commune; }
    public void setSecteur(String secteur) { this.secteur = secteur; }
    public void setAgentLatitude(Double agentLatitude) { this.agentLatitude = agentLatitude; }
    public void setAgentLongitude(Double agentLongitude) { this.agentLongitude = agentLongitude; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setActive(boolean active) { isActive = active; }
    public void setAgentCategories(String agentCategories) { this.agentCategories = agentCategories; }
    public void setCity(String city) { this.city = city; }
}