package ma.medinalink.dto;

public class PriorityRequest {

    private String title;
    private String description;
    private String category;
    private String status;
    private Double budget;
    private String zone;
    private String startDate;
    private String endDate;
    private String responsibleId;
    private String communeId;

    public PriorityRequest() {}

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public String getStatus() { return status; }
    public Double getBudget() { return budget; }
    public String getZone() { return zone; }
    public String getStartDate() { return startDate; }
    public String getEndDate() { return endDate; }
    public String getResponsibleId() { return responsibleId; }
    public String getCommuneId() { return communeId; }

    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setCategory(String category) { this.category = category; }
    public void setStatus(String status) { this.status = status; }
    public void setBudget(Double budget) { this.budget = budget; }
    public void setZone(String zone) { this.zone = zone; }
    public void setStartDate(String startDate) { this.startDate = startDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }
    public void setResponsibleId(String responsibleId) { this.responsibleId = responsibleId; }
    public void setCommuneId(String communeId) { this.communeId = communeId; }
}
