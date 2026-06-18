package ma.medinalink.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class ReportStatusHistoryResponse {
    private UUID id;
    private String fromStatus;
    private String toStatus;
    private String changedByName;
    private LocalDateTime changedAt;

    public ReportStatusHistoryResponse() {}

    public ReportStatusHistoryResponse(UUID id, String fromStatus, String toStatus,
                                        String changedByName, LocalDateTime changedAt) {
        this.id = id;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.changedByName = changedByName;
        this.changedAt = changedAt;
    }

    public UUID getId() { return id; }
    public String getFromStatus() { return fromStatus; }
    public String getToStatus() { return toStatus; }
    public String getChangedByName() { return changedByName; }
    public LocalDateTime getChangedAt() { return changedAt; }

    public void setId(UUID id) { this.id = id; }
    public void setFromStatus(String fromStatus) { this.fromStatus = fromStatus; }
    public void setToStatus(String toStatus) { this.toStatus = toStatus; }
    public void setChangedByName(String changedByName) { this.changedByName = changedByName; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
}
