package ma.medinalink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_comments")
public class ReportComment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "author_name", length = 150)
    private String authorName;

    @Column(name = "author_role", length = 20)
    private String authorRole;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getReportId() { return reportId; }
    public UUID getUserId() { return userId; }
    public String getAuthorName() { return authorName; }
    public String getAuthorRole() { return authorRole; }
    public String getContent() { return content; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public void setAuthorRole(String authorRole) { this.authorRole = authorRole; }
    public void setContent(String content) { this.content = content; }
}
