package ma.medinalink.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import ma.medinalink.config.AppConfig;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@ApplicationScoped
public class AiService {

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .version(HttpClient.Version.HTTP_1_1)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    // ── Classification automatique ────────────────────────────────

    public AiResult classify(String title, String description) {
        try {
            String safeTitle = escape(title);
            String safeDesc  = escape(description != null ? description : "");
            String body = "{\"title\":\"" + safeTitle + "\",\"description\":\"" + safeDesc + "\"}";

            HttpResponse<String> response = post("/classify", body);
            if (response.statusCode() == 200) {
                String json = response.body();
                int priority = extractInt(json, "priority");
                String category = extractString(json, "category");
                return new AiResult(category, priority);
            }
        } catch (Exception e) {
            System.err.println("[AiService] classify failed: " + e.getMessage());
        }
        return new AiResult("OTHER", 2);
    }

    // ── Chat (proxy citoyen / agent) ─────────────────────────────

    public String chat(String messagesJson, String contextType, String reportDataJson) {
        try {
            String rdPart = reportDataJson != null
                    ? ",\"report_data\":" + reportDataJson
                    : "";
            String body = "{\"messages\":" + messagesJson
                    + ",\"context_type\":\"" + contextType + "\""
                    + rdPart + "}";

            HttpResponse<String> response = post("/chat", body);
            if (response.statusCode() == 200) {
                return extractString(response.body(), "reply");
            }
        } catch (Exception e) {
            System.err.println("[AiService] chat failed: " + e.getMessage());
        }
        return "Service IA temporairement indisponible.";
    }

    // ── Analyse complète ──────────────────────────────────────────

    public String analyze(String analyzeJson) {
        try {
            HttpResponse<String> response = post("/analyze", analyzeJson);
            if (response.statusCode() == 200) {
                return extractString(response.body(), "analysis");
            }
        } catch (Exception e) {
            System.err.println("[AiService] analyze failed: " + e.getMessage());
        }
        return "Analyse indisponible.";
    }

    // ── Helpers ───────────────────────────────────────────────────

    private HttpResponse<String> post(String path, String body) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(AppConfig.aiServiceUrl() + path))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "'").replace("\n", " ").replace("\r", "");
    }

    private int extractInt(String json, String key) {
        try {
            JsonNode node = mapper.readTree(json);
            JsonNode val  = node.get(key);
            return val != null ? val.asInt(2) : 2;
        } catch (Exception e) { return 2; }
    }

    private String extractString(String json, String key) {
        try {
            JsonNode node = mapper.readTree(json);
            JsonNode val  = node.get(key);
            return val != null ? val.asText("") : "";
        } catch (Exception e) { return ""; }
    }

    // ── DTO résultat classification ───────────────────────────────

    public static class AiResult {
        public final String category;
        public final int priority;
        public AiResult(String category, int priority) {
            this.category = category;
            this.priority = priority;
        }
    }
}
