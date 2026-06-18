package ma.medinalink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_status_history")
public class ReportStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @Column(name = "from_status", length = 20)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 20)
    private String toStatus;

    @Column(name = "changed_by_name", length = 150)
    private String changedByName;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    public ReportStatusHistory() {}

    @PrePersist
    protected void onCreate() {
        this.changedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public Report getReport() { return report; }
    public String getFromStatus() { return fromStatus; }
    public String getToStatus() { return toStatus; }
    public String getChangedByName() { return changedByName; }
    public LocalDateTime getChangedAt() { return changedAt; }

    public void setId(UUID id) { this.id = id; }
    public void setReport(Report report) { this.report = report; }
    public void setFromStatus(String fromStatus) { this.fromStatus = fromStatus; }
    public void setToStatus(String toStatus) { this.toStatus = toStatus; }
    public void setChangedByName(String changedByName) { this.changedByName = changedByName; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
}
