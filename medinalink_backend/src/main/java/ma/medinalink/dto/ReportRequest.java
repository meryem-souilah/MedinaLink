package ma.medinalink.dto;

public class ReportRequest {

    private String title;
    private String description;
    private Double longitude;
    private Double latitude;
    private String address;
    private String category;
    private String photoBase64; // NOUVEAU : photo en Base64

    public ReportRequest() {}

    // Getters
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Double getLongitude() { return longitude; }
    public Double getLatitude() { return latitude; }
    public String getAddress() { return address; }
    public String getCategory() { return category; }
    public String getPhotoBase64() { return photoBase64; }

    // Setters
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public void setAddress(String address) { this.address = address; }
    public void setCategory(String category) { this.category = category; }
    public void setPhotoBase64(String photoBase64) { this.photoBase64 = photoBase64; }
}