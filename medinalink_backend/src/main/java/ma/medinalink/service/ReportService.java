package ma.medinalink.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import ma.medinalink.dto.ReportRequest;
import ma.medinalink.dto.ReportResponse;
import ma.medinalink.dto.ReportStatusHistoryResponse;
import ma.medinalink.entity.AiInteraction;
import ma.medinalink.entity.PublicPriority;
import ma.medinalink.entity.Report;
import ma.medinalink.entity.ReportStatusHistory;
import ma.medinalink.entity.User;
import ma.medinalink.repository.AiInteractionRepository;
import ma.medinalink.repository.PriorityRepository;
import ma.medinalink.repository.ReportRepository;
import ma.medinalink.repository.ReportStatusHistoryRepository;
import ma.medinalink.repository.UserRepository;
import ma.medinalink.resource.NotificationEndpoint;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class ReportService {

    @Inject
    private ReportRepository reportRepository;

    @Inject
    private UserRepository userRepository;

    @Inject
    private AiService aiService;

    @Inject
    private AiInteractionRepository aiInteractionRepository;

    @Inject
    private ReportStatusHistoryRepository historyRepository;

    @Inject
    private PriorityRepository priorityRepository;

    public ReportResponse create(ReportRequest request, UUID userId) {

        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new BadRequestException("Le titre est obligatoire");
        }
        if (request.getLongitude() == null || request.getLatitude() == null) {
            throw new BadRequestException("Les coordonnées GPS sont obligatoires");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé"));

        String finalCategory = request.getCategory() != null && !request.getCategory().equals("OTHER")
                ? request.getCategory()
                : null;

        if (finalCategory == null) {
            AiService.AiResult aiResult = aiService.classify(
                request.getTitle(), request.getDescription()
            );
            finalCategory = aiResult.category;

            try {
                AiInteraction log = new AiInteraction();
                log.setInteractionType("CLASSIFY");
                log.setAgentUsed("classifier");
                log.setUserInput(request.getTitle() + " — " + request.getDescription());
                log.setAiResponse("category=" + aiResult.category + ", priority=" + aiResult.priority);
                log.setUser(user);
                aiInteractionRepository.save(log);
            } catch (Exception ignored) {}
        }

        Report report = new Report();
        report.setTitle(request.getTitle().trim());
        report.setDescription(request.getDescription());
        report.setLongitude(request.getLongitude());
        report.setLatitude(request.getLatitude());
        report.setAddress(request.getAddress());
        report.setStatus("PENDING");
        report.setUser(user);
        report.setCategory(finalCategory);

        if (request.getPhotoBase64() != null && !request.getPhotoBase64().isBlank()) {
            report.setPhotoUrl(request.getPhotoBase64());
        }

        Report saved = reportRepository.save(report);
        assignNearestAgent(saved);
        return toResponse(saved);
    }

    private void assignNearestAgent(Report report) {
        try {
            List<User> allAgents = userRepository.findAllAgents();
            if (allAgents.isEmpty()) return;

            // 1. Priorité : agents dont le secteur correspond à l'adresse du signalement
            List<User> candidates = allAgents;
            String address = report.getAddress();
            if (address != null && !address.isBlank()) {
                String addrLower = address.toLowerCase();
                List<User> sectorMatches = allAgents.stream()
                    .filter(a -> a.getSecteur() != null && !a.getSecteur().isBlank()
                              && addrLower.contains(a.getSecteur().toLowerCase()))
                    .collect(Collectors.toList());
                if (!sectorMatches.isEmpty()) {
                    candidates = sectorMatches;
                }
            }

            // 2. Parmi les candidats, choisir le plus proche par GPS
            User nearest = null;
            double minDist = Double.MAX_VALUE;
            for (User agent : candidates) {
                if (agent.getAgentLatitude() == null || agent.getAgentLongitude() == null) continue;
                double dist = haversine(report.getLatitude(), report.getLongitude(),
                                       agent.getAgentLatitude(), agent.getAgentLongitude());
                if (dist < minDist) { minDist = dist; nearest = agent; }
            }

            // 3. Fallback : aucun candidat n'a de coords GPS → premier de la liste
            if (nearest == null) nearest = candidates.get(0);

            report.setAssignedAgentId(nearest.getId());
            report.setAssignedAgentName(nearest.getFullName());
            report.setSecteur(nearest.getSecteur());
            reportRepository.update(report);

            System.out.println("[ReportService] Assigné à : " + nearest.getFullName()
                + " (secteur=" + nearest.getSecteur() + ", dist=" + (int) minDist + "m)");
        } catch (Exception e) {
            System.err.println("[ReportService] Auto-assignation échouée : " + e.getMessage());
        }
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    public ReportResponse findById(UUID id) {
        Report report = reportRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Signalement non trouvé"));
        return toResponse(report);
    }

    public List<ReportResponse> findAll(int page, int size, String status, String category, UUID agentId) {
        List<Report> reports = agentId != null
            ? reportRepository.findByAgentId(agentId, page, size, status, category)
            : reportRepository.findAll(page, size, status, category);
        return reports.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public java.util.Map<String, Long> getStats(UUID agentId) {
        return agentId != null
            ? reportRepository.countStatsByAgent(agentId)
            : reportRepository.countStats();
    }

    public List<ReportResponse> findNearby(double lng, double lat, double radiusMeters) {
        if (radiusMeters > 50000) {
            throw new BadRequestException("Le rayon maximum est 50km");
        }
        return reportRepository.findNearby(lng, lat, radiusMeters)
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public ReportResponse updateStatus(UUID id, String newStatus, UUID agentUserId) {
        List<String> validStatuses = List.of("PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED");
        if (!validStatuses.contains(newStatus)) {
            throw new BadRequestException("Statut invalide");
        }

        Report report = reportRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Signalement non trouvé"));

        String oldStatus = report.getStatus();
        Report updated = reportRepository.updateStatus(id, newStatus);

        // Log status history
        try {
            String agentName = userRepository.findById(agentUserId)
                .map(User::getFullName)
                .orElse("Agent inconnu");

            ReportStatusHistory history = new ReportStatusHistory();
            history.setReport(updated);
            history.setFromStatus(oldStatus);
            history.setToStatus(newStatus);
            history.setChangedByName(agentName);
            historyRepository.save(history);
        } catch (Exception ignored) {}

        // Notify citizen via WebSocket
        String userId = updated.getUser().getId().toString();
        String msg = switch (newStatus) {
            case "IN_PROGRESS" -> "Votre signalement \"" + updated.getTitle() + "\" est en cours de traitement.";
            case "RESOLVED"    -> "Votre signalement \"" + updated.getTitle() + "\" a été résolu !";
            case "REJECTED"    -> "Votre signalement \"" + updated.getTitle() + "\" a été rejeté.";
            default            -> "Statut de votre signalement mis à jour.";
        };
        NotificationEndpoint.notifyUser(userId, msg);

        return toResponse(updated);
    }

    public ReportResponse updateNotes(UUID id, String notes) {
        Report report = reportRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Signalement non trouvé"));
        report.setAgentNotes(notes);
        Report updated = reportRepository.update(report);
        return toResponse(updated);
    }

    public List<ReportStatusHistoryResponse> getStatusHistory(UUID id) {
        if (reportRepository.findById(id).isEmpty()) {
            throw new NotFoundException("Signalement non trouvé");
        }
        return historyRepository.findByReportId(id)
            .stream()
            .map(h -> new ReportStatusHistoryResponse(
                h.getId(), h.getFromStatus(), h.getToStatus(),
                h.getChangedByName(), h.getChangedAt()
            ))
            .collect(Collectors.toList());
    }

    public ReportResponse linkPriority(UUID reportId, UUID priorityId) {
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new NotFoundException("Signalement non trouvé"));

        if (priorityId != null && priorityRepository.findById(priorityId).isEmpty()) {
            throw new NotFoundException("Priorité non trouvée");
        }

        report.setPriorityId(priorityId);
        Report updated = reportRepository.update(report);
        return toResponse(updated);
    }

    public ReportResponse upvote(UUID id) {
        Report updated = reportRepository.upvote(id);
        if (updated == null) {
            throw new NotFoundException("Signalement non trouvé");
        }
        return toResponse(updated);
    }

    public int assignPendingReportsToAgent(User agent) {
        if (agent.getSecteur() == null || agent.getSecteur().isBlank()) return 0;
        List<Report> pending = reportRepository.findPendingBySector(agent.getSecteur());
        for (Report report : pending) {
            report.setAssignedAgentId(agent.getId());
            report.setAssignedAgentName(agent.getFullName());
            report.setSecteur(agent.getSecteur());
            reportRepository.update(report);
        }
        System.out.println("[ReportService] " + pending.size() + " signalement(s) PENDING assigné(s) à "
            + agent.getFullName() + " (secteur=" + agent.getSecteur() + ")");
        return pending.size();
    }

    public ReportResponse assignToAgent(UUID reportId, UUID agentId) {
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new NotFoundException("Signalement non trouvé"));
        User agent = userRepository.findById(agentId)
            .orElseThrow(() -> new NotFoundException("Agent non trouvé"));
        report.setAssignedAgentId(agent.getId());
        report.setAssignedAgentName(agent.getFullName());
        report.setSecteur(agent.getSecteur());
        return toResponse(reportRepository.update(report));
    }

    private ReportResponse toResponse(Report report) {
        String userFullName = report.getUser() != null ? report.getUser().getFullName() : "Anonyme";

        String priorityTitle = null;
        if (report.getPriorityId() != null) {
            priorityTitle = priorityRepository.findById(report.getPriorityId())
                .map(PublicPriority::getTitle)
                .orElse(null);
        }

        return new ReportResponse(
            report.getId(),
            report.getTitle(),
            report.getDescription(),
            report.getLongitude(),
            report.getLatitude(),
            report.getAddress(),
            report.getCategory(),
            report.getStatus(),
            report.getUpvotes(),
            report.getPhotoUrl(),
            userFullName,
            report.getCreatedAt(),
            report.getAgentNotes(),
            report.getPriorityId(),
            priorityTitle,
            report.getAssignedAgentId(),
            report.getAssignedAgentName(),
            report.getSecteur()
        );
    }
}
