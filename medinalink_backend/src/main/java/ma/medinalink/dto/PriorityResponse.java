package ma.medinalink.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class PriorityResponse {

    private UUID id;
    private String title;
    private String description;
    private String category;
    private String status;
    private Double budget;
    private String zone;
    private Integer progress;
    private String responsibleFullName;
    private String communeName;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public PriorityResponse() {}

    public PriorityResponse(UUID id, String title, String description,
                            String category, String status, Double budget,
                            String zone, Integer progress, String responsibleFullName,
                            String communeName, LocalDate startDate, LocalDate endDate,
                            LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.status = status;
        this.budget = budget;
        this.zone = zone;
        this.progress = progress;
        this.responsibleFullName = responsibleFullName;
        this.communeName = communeName;
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public String getStatus() { return status; }
    public Double getBudget() { return budget; }
    public String getZone() { return zone; }
    public Integer getProgress() { return progress; }
    public String getResponsibleFullName() { return responsibleFullName; }
    public String getCommuneName() { return communeName; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setId(UUID id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setCategory(String category) { this.category = category; }
    public void setStatus(String status) { this.status = status; }
    public void setBudget(Double budget) { this.budget = budget; }
    public void setZone(String zone) { this.zone = zone; }
    public void setProgress(Integer progress) { this.progress = progress; }
    public void setResponsibleFullName(String responsibleFullName) { this.responsibleFullName = responsibleFullName; }
    public void setCommuneName(String communeName) { this.communeName = communeName; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
