package ma.medinalink.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class ReportResponse {

    private UUID id;
    private String title;
    private String description;
    private Double longitude;
    private Double latitude;
    private String address;
    private String category;
    private String status;
    private Integer upvotes;
    private String photoUrl;
    private String userFullName;
    private LocalDateTime createdAt;
    private String agentNotes;
    private UUID priorityId;
    private String priorityTitle;

    public ReportResponse() {}

    public ReportResponse(UUID id, String title, String description,
                          Double longitude, Double latitude, String address,
                          String category, String status, Integer upvotes,
                          String photoUrl, String userFullName,
                          LocalDateTime createdAt, String agentNotes,
                          UUID priorityId, String priorityTitle) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.longitude = longitude;
        this.latitude = latitude;
        this.address = address;
        this.category = category;
        this.status = status;
        this.upvotes = upvotes;
        this.photoUrl = photoUrl;
        this.userFullName = userFullName;
        this.createdAt = createdAt;
        this.agentNotes = agentNotes;
        this.priorityId = priorityId;
        this.priorityTitle = priorityTitle;
    }

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
    public String getUserFullName() { return userFullName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getAgentNotes() { return agentNotes; }
    public UUID getPriorityId() { return priorityId; }
    public String getPriorityTitle() { return priorityTitle; }

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
    public void setUserFullName(String userFullName) { this.userFullName = userFullName; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setAgentNotes(String agentNotes) { this.agentNotes = agentNotes; }
    public void setPriorityId(UUID priorityId) { this.priorityId = priorityId; }
    public void setPriorityTitle(String priorityTitle) { this.priorityTitle = priorityTitle; }
}
