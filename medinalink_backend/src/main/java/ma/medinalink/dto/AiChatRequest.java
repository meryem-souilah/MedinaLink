package ma.medinalink.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class AiChatRequest {

    private List<Message> messages;

    @JsonProperty("context_type")
    private String contextType;

    @JsonProperty("report_data")
    private Object reportData;

    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }
    public String getContextType() { return contextType; }
    public void setContextType(String contextType) { this.contextType = contextType; }
    public Object getReportData() { return reportData; }
    public void setReportData(Object reportData) { this.reportData = reportData; }

    public static class Message {
        private String role;
        private String content;
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}
