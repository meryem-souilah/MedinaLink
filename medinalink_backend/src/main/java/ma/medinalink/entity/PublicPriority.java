package ma.medinalink.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "public_priorities")
public class PublicPriority {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category", length = 50)
    private String category = "GENERAL";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PriorityStatus status = PriorityStatus.PLANNED;

    @Column(name = "budget")
    private Double budget;

    @Column(name = "zone", length = 150)
    private String zone;

    @Column(name = "progress")
    private Integer progress = 0;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "responsible_id")
    private User responsible;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "commune_id")
    private Commune commune;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public PublicPriority() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public PriorityStatus getStatus() { return status; }
    public Double getBudget() { return budget; }
    public String getZone() { return zone; }
    public Integer getProgress() { return progress; }
    public User getResponsible() { return responsible; }
    public Commune getCommune() { return commune; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setId(UUID id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setCategory(String category) { this.category = category; }
    public void setStatus(PriorityStatus status) { this.status = status; }
    public void setBudget(Double budget) { this.budget = budget; }
    public void setZone(String zone) { this.zone = zone; }
    public void setProgress(Integer progress) { this.progress = progress; }
    public void setResponsible(User responsible) { this.responsible = responsible; }
    public void setCommune(Commune commune) { this.commune = commune; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
