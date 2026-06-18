package ma.medinalink.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_interactions")
public class AiInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id")
    private Report report;

    @Column(name = "interaction_type", nullable = false, length = 20)
    private String interactionType;

    @Column(name = "agent_used", length = 50)
    private String agentUsed;

    @Column(name = "user_input", columnDefinition = "TEXT")
    private String userInput;

    @Column(name = "ai_response", columnDefinition = "TEXT")
    private String aiResponse;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public AiInteraction() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public Report getReport() { return report; }
    public String getInteractionType() { return interactionType; }
    public String getAgentUsed() { return agentUsed; }
    public String getUserInput() { return userInput; }
    public String getAiResponse() { return aiResponse; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setUser(User user) { this.user = user; }
    public void setReport(Report report) { this.report = report; }
    public void setInteractionType(String interactionType) { this.interactionType = interactionType; }
    public void setAgentUsed(String agentUsed) { this.agentUsed = agentUsed; }
    public void setUserInput(String userInput) { this.userInput = userInput; }
    public void setAiResponse(String aiResponse) { this.aiResponse = aiResponse; }
}
