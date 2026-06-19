package ma.medinalink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_votes",
       uniqueConstraints = @UniqueConstraint(columnNames = {"report_id", "user_id"}))
public class ReportVote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getReportId() { return reportId; }
    public UUID getUserId() { return userId; }

    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public void setUserId(UUID userId) { this.userId = userId; }
}
