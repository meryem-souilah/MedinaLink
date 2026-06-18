package ma.medinalink.resource;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ma.medinalink.config.Secured;
import ma.medinalink.dto.AiChatRequest;
import ma.medinalink.dto.ReportResponse;
import ma.medinalink.entity.AiInteraction;
import ma.medinalink.entity.Report;
import ma.medinalink.entity.User;
import ma.medinalink.repository.AiInteractionRepository;
import ma.medinalink.repository.ReportRepository;
import ma.medinalink.repository.UserRepository;
import ma.medinalink.service.AiService;
import ma.medinalink.service.JwtService;
import ma.medinalink.service.ReportService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/ai")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AiResource {

    @Inject private AiService aiService;
    @Inject private ReportService reportService;
    @Inject private ReportRepository reportRepository;
    @Inject private UserRepository userRepository;
    @Inject private AiInteractionRepository aiInteractionRepository;
    @Inject private JwtService jwtService;

    private final ObjectMapper mapper = new ObjectMapper();

    // ── Santé du service IA ──────────────────────────────────────
    @GET
    @Path("/health")
    public Response health() {
        return Response.ok(Map.of("ai_service", "proxied")).build();
    }

    // ── Chat citoyen ou agent ────────────────────────────────────
    @POST
    @Path("/chat")
    @Secured
    public Response chat(AiChatRequest request, @Context HttpHeaders headers) {
        try {
            if (request.getMessages() == null || request.getMessages().isEmpty()) {
                return Response.status(400).entity(Map.of("message", "Messages requis")).build();
            }
            String contextType = request.getContextType() != null ? request.getContextType() : "citizen";

            // Sérialiser messages et reportData en JSON pour AiService
            String messagesJson = mapper.writeValueAsString(request.getMessages());
            String reportDataJson = request.getReportData() != null
                    ? mapper.writeValueAsString(request.getReportData())
                    : null;

            // Pour le contexte citoyen : injecter les stats réelles + liste des signalements
            if ("citizen".equals(contextType) && reportDataJson == null) {
                try {
                    java.util.Map<String, Long> stats = reportRepository.countStats();

                    List<ma.medinalink.entity.Report> reports = reportRepository.findAll(0, 30, null, null);
                    List<Map<String, String>> reportsList = reports.stream()
                        .map(r -> Map.of(
                            "title",    r.getTitle()    != null ? r.getTitle()    : "",
                            "category", r.getCategory() != null ? r.getCategory() : "",
                            "status",   r.getStatus()   != null ? r.getStatus()   : "",
                            "address",  r.getAddress()  != null ? r.getAddress()  : ""
                        ))
                        .collect(java.util.stream.Collectors.toList());

                    reportDataJson = mapper.writeValueAsString(Map.of(
                        "db_stats", Map.of(
                            "total_reports", stats.getOrDefault("TOTAL",       0L),
                            "pending",       stats.getOrDefault("PENDING",     0L),
                            "in_progress",   stats.getOrDefault("IN_PROGRESS", 0L),
                            "resolved",      stats.getOrDefault("RESOLVED",    0L),
                            "rejected",      stats.getOrDefault("REJECTED",    0L)
                        ),
                        "reports_list", reportsList
                    ));
                } catch (Exception ignored) {}
            }

            String reply = aiService.chat(messagesJson, contextType, reportDataJson);

            // ── Log de l'interaction ──
            try {
                String lastUserMsg = request.getMessages().stream()
                    .filter(m -> "user".equals(m.getRole()))
                    .reduce((a, b) -> b)
                    .map(AiChatRequest.Message::getContent)
                    .orElse("");
                String agentUsed = "citizen".equals(contextType) ? "citizen_assistant" : "municipal_agent";

                AiInteraction log = new AiInteraction();
                log.setInteractionType("CHAT");
                log.setAgentUsed(agentUsed);
                log.setUserInput(lastUserMsg);
                log.setAiResponse(reply);
                log.setUser(resolveUser(headers));
                aiInteractionRepository.save(log);
            } catch (Exception ignored) {}

            return Response.ok(Map.of("reply", reply)).build();

        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", "Erreur chat : " + e.getMessage())).build();
        }
    }

    // ── Analyse complète d'un signalement ────────────────────────
    @POST
    @Path("/analyze/{reportId}")
    @Secured
    public Response analyzeReport(@PathParam("reportId") UUID reportId, @Context HttpHeaders headers) {
        try {
            ReportResponse report = reportService.findById(reportId);

            List<ReportResponse> nearby = reportService.findNearby(
                    report.getLongitude(), report.getLatitude(), 1000
            );
            nearby.removeIf(r -> r.getId().equals(reportId));

            String analyzeJson = buildAnalyzeJson(report, nearby);
            String analysis = aiService.analyze(analyzeJson);

            // ── Log de l'interaction ──
            try {
                AiInteraction log = new AiInteraction();
                log.setInteractionType("ANALYZE");
                log.setAgentUsed("analyzer");
                log.setUserInput(report.getTitle());
                log.setAiResponse(analysis);
                log.setUser(resolveUser(headers));
                reportRepository.findById(reportId).ifPresent(r -> log.setReport(r));
                aiInteractionRepository.save(log);
            } catch (Exception ignored) {}

            return Response.ok(Map.of("analysis", analysis, "reportId", reportId)).build();

        } catch (NotFoundException e) {
            return Response.status(404).entity(Map.of("message", "Signalement non trouvé")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", "Erreur analyse : " + e.getMessage())).build();
        }
    }

    private User resolveUser(HttpHeaders headers) {
        try {
            String auth = headers.getHeaderString(HttpHeaders.AUTHORIZATION);
            if (auth == null || !auth.startsWith("Bearer ")) return null;
            UUID userId = jwtService.getUserIdFromToken(auth.substring(7));
            return userRepository.findById(userId).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private String buildAnalyzeJson(ReportResponse report, List<ReportResponse> nearby) throws Exception {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"title\":\"").append(esc(report.getTitle())).append("\",");
        sb.append("\"description\":\"").append(esc(report.getDescription())).append("\",");
        sb.append("\"category\":\"").append(esc(report.getCategory())).append("\",");
        sb.append("\"status\":\"").append(esc(report.getStatus())).append("\",");
        sb.append("\"upvotes\":").append(report.getUpvotes()).append(",");
        sb.append("\"address\":\"").append(esc(report.getAddress())).append("\",");
        sb.append("\"nearby_reports\":[");
        for (int i = 0; i < nearby.size(); i++) {
            ReportResponse r = nearby.get(i);
            if (i > 0) sb.append(",");
            sb.append("{\"title\":\"").append(esc(r.getTitle())).append("\",");
            sb.append("\"category\":\"").append(esc(r.getCategory())).append("\",");
            sb.append("\"status\":\"").append(esc(r.getStatus())).append("\"}");
        }
        sb.append("]}");
        return sb.toString();
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "'").replace("\n", " ").replace("\r", "");
    }
}
