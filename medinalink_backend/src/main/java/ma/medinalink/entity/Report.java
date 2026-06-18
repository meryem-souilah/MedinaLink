package ma.medinalink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reports")
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // On stocke longitude et latitude comme deux colonnes simples
    // au lieu d'un objet Point PostGIS — plus simple et compatible
    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "address", length = 300)
    private String address;

    @Column(name = "category", nullable = false, length = 20)
    private String category = "OTHER";

    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "upvotes")
    private Integer upvotes = 0;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "commune_id")
    private Commune commune;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "agent_notes", columnDefinition = "TEXT")
    private String agentNotes;

    @Column(name = "priority_id")
    private java.util.UUID priorityId;

    public Report() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters
    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Double getLongitude() { return longitude; }
    public Double getLatitude() { return latitude; }
    public String getAddress() { return address; }
    public String getCategory() { return category; }
    public String getStatus() { return status; }
    public Integer getUpvotes() { return upvotes; }
    public String getPhotoUrl() { return photoUrl; }
    public User getUser() { return user; }
    public Commune getCommune() { return commune; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getAgentNotes() { return agentNotes; }
    public java.util.UUID getPriorityId() { return priorityId; }

    // Setters
    public void setId(UUID id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public void setAddress(String address) { this.address = address; }
    public void setCategory(String category) { this.category = category; }
    public void setStatus(String status) { this.status = status; }
    public void setUpvotes(Integer upvotes) { this.upvotes = upvotes; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public void setUser(User user) { this.user = user; }
    public void setCommune(Commune commune) { this.commune = commune; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public void setAgentNotes(String agentNotes) { this.agentNotes = agentNotes; }
    public void setPriorityId(java.util.UUID priorityId) { this.priorityId = priorityId; }
}