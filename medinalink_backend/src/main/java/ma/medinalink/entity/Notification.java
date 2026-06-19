package ma.medinalink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "report_id")
    private UUID reportId;

    @Column(name = "report_title", length = 200)
    private String reportTitle;

    @Column(name = "message", length = 500)
    private String message;

    @Column(name = "type", length = 50)
    private String type; // STATUS_CHANGE, COMMENT

    @Column(name = "is_read")
    private boolean isRead = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getReportId() { return reportId; }
    public String getReportTitle() { return reportTitle; }
    public String getMessage() { return message; }
    public String getType() { return type; }
    public boolean isRead() { return isRead; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setUserId(UUID userId) { this.userId = userId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public void setReportTitle(String reportTitle) { this.reportTitle = reportTitle; }
    public void setMessage(String message) { this.message = message; }
    public void setType(String type) { this.type = type; }
    public void setRead(boolean read) { this.isRead = read; }
}
