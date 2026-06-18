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

import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class ReportService {

    // Bounding boxes des villes marocaines : [latMin, latMax, lngMin, lngMax]
    // Noms normalisés (sans accents, minuscules) — la detection utilise normalize()
    private static final Map<String, double[]> CITY_BOUNDS = new HashMap<>();
    static {
        CITY_BOUNDS.put("casablanca",  new double[]{33.40, 33.73, -7.72, -7.36});
        CITY_BOUNDS.put("rabat",       new double[]{33.90, 34.10, -6.95, -6.72});
        CITY_BOUNDS.put("sale",        new double[]{33.98, 34.10, -6.87, -6.72});
        CITY_BOUNDS.put("marrakech",   new double[]{31.55, 31.73, -8.12, -7.90});
        CITY_BOUNDS.put("fes",         new double[]{33.95, 34.15, -5.12, -4.90});
        CITY_BOUNDS.put("tanger",      new double[]{35.65, 35.86, -5.92, -5.68});
        CITY_BOUNDS.put("agadir",      new double[]{30.35, 30.50, -9.68, -9.50});
        CITY_BOUNDS.put("meknes",      new double[]{33.82, 33.96, -5.65, -5.48});
        CITY_BOUNDS.put("oujda",       new double[]{34.62, 34.75, -1.98, -1.82});
        CITY_BOUNDS.put("kenitra",     new double[]{34.22, 34.40, -6.70, -6.55});
        CITY_BOUNDS.put("tetouan",     new double[]{35.52, 35.63, -5.40, -5.25});
        CITY_BOUNDS.put("mohammedia", new double[]{33.62, 33.75, -7.42, -7.28});
        CITY_BOUNDS.put("el jadida",   new double[]{33.18, 33.30, -8.58, -8.45});
        CITY_BOUNDS.put("safi",        new double[]{32.22, 32.38, -9.32, -9.18});
        CITY_BOUNDS.put("beni mellal", new double[]{32.28, 32.48, -6.45, -6.28});
        CITY_BOUNDS.put("nador",       new double[]{35.12, 35.23, -3.02, -2.88});
        CITY_BOUNDS.put("khouribga",   new double[]{32.82, 32.96, -6.95, -6.85});
        CITY_BOUNDS.put("settat",      new double[]{32.95, 33.12, -7.75, -7.58});
        CITY_BOUNDS.put("berrechid",   new double[]{33.22, 33.32, -7.62, -7.48});
        CITY_BOUNDS.put("laayoune",    new double[]{27.02, 27.20, -13.30, -12.98});
        CITY_BOUNDS.put("dakhla",      new double[]{23.58, 23.78, -16.02, -15.88});
        CITY_BOUNDS.put("errachidia",  new double[]{31.88, 32.02, -4.55, -4.38});
        CITY_BOUNDS.put("ouarzazate",  new double[]{30.88, 30.98, -6.98, -6.82});
        CITY_BOUNDS.put("essaouira",   new double[]{31.48, 31.55, -9.82, -9.72});
        CITY_BOUNDS.put("chefchaouen", new double[]{35.12, 35.22, -5.32, -5.18});
        CITY_BOUNDS.put("tiznit",      new double[]{29.68, 29.80, -9.78, -9.65});
        CITY_BOUNDS.put("taroudant",   new double[]{30.45, 30.58, -8.95, -8.80});
        CITY_BOUNDS.put("al hoceima",  new double[]{35.22, 35.32, -4.02, -3.88});
        CITY_BOUNDS.put("guelmim",     new double[]{28.92, 29.05, -10.18, -9.98});
        CITY_BOUNDS.put("tan tan",     new double[]{28.42, 28.52, -11.18, -10.98});
        CITY_BOUNDS.put("zagora",      new double[]{30.28, 30.40, -6.02, -5.88});
        CITY_BOUNDS.put("ifrane",      new double[]{33.48, 33.58, -5.18, -5.05});
        CITY_BOUNDS.put("azrou",       new double[]{33.42, 33.52, -5.30, -5.18});
        CITY_BOUNDS.put("tinghir",     new double[]{31.48, 31.60, -5.60, -5.48});
    }

    // Normalise un nom de ville : retire accents, minuscules, trim
    private static String normalize(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase().trim();
    }

    // Retourne la clé normalisée de la ville si le GPS tombe dans son bounding box
    private String detectCity(double lat, double lng) {
        for (Map.Entry<String, double[]> e : CITY_BOUNDS.entrySet()) {
            double[] b = e.getValue();
            if (lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3]) return e.getKey();
        }
        return null;
    }

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

    // Vérifie si un agent gère une catégorie donnée
    // Un agent sans catégorie configurée gère tout
    private boolean agentHandlesCategory(User agent, String category) {
        String cats = agent.getAgentCategories();
        if (cats == null || cats.isBlank()) return true;
        if (category == null) return true;
        for (String c : cats.split(",")) {
            if (c.trim().equalsIgnoreCase(category)) return true;
        }
        return false;
    }

    private void assignNearestAgent(Report report) {
        try {
            List<User> allAgents = userRepository.findAllAgents();
            if (allAgents.isEmpty()) return;

            String city     = detectCity(report.getLatitude(), report.getLongitude());
            String category = report.getCategory();

            // Priorité 1 : même ville + même catégorie
            List<User> cityAgents = city != null
                ? allAgents.stream().filter(a -> normalize(a.getSecteur()).equals(city)).collect(Collectors.toList())
                : List.of();

            List<User> candidates;
            if (!cityAgents.isEmpty()) {
                List<User> specialized = cityAgents.stream()
                    .filter(a -> agentHandlesCategory(a, category))
                    .collect(Collectors.toList());
                // Priorité 2 : même ville, catégorie non restreinte
                candidates = specialized.isEmpty() ? cityAgents : specialized;
            } else {
                // Priorité 3 : même catégorie toutes villes
                List<User> catAgents = allAgents.stream()
                    .filter(a -> agentHandlesCategory(a, category))
                    .collect(Collectors.toList());
                // Priorité 4 : n'importe quel agent
                candidates = catAgents.isEmpty() ? allAgents : catAgents;
            }

            // Parmi les candidats, prendre le premier (ou le plus proche GPS)
            User chosen = candidates.get(0);
            double minDist = Double.MAX_VALUE;
            for (User agent : candidates) {
                if (agent.getAgentLatitude() == null || agent.getAgentLongitude() == null) continue;
                double dist = haversine(report.getLatitude(), report.getLongitude(),
                                       agent.getAgentLatitude(), agent.getAgentLongitude());
                if (dist < minDist) { minDist = dist; chosen = agent; }
            }

            report.setAssignedAgentId(chosen.getId());
            report.setAssignedAgentName(chosen.getFullName());
            report.setSecteur(chosen.getSecteur());
            reportRepository.update(report);

            System.out.println("[ReportService] Assigné à : " + chosen.getFullName()
                + " (ville=" + city + ", catégorie=" + category + ")");
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

        String cityKey = normalize(agent.getSecteur());
        double[] bounds = CITY_BOUNDS.get(cityKey);

        String cats = agent.getAgentCategories();
        String[] categories = (cats != null && !cats.isBlank()) ? cats.split(",") : null;

        List<Report> pending = new java.util.ArrayList<>();

        if (bounds != null) {
            if (categories != null) {
                // Ville connue + catégories spécifiques
                for (String cat : categories) {
                    pending.addAll(reportRepository.findPendingInBoundsAndCategory(
                        bounds[0], bounds[1], bounds[2], bounds[3], cat.trim()));
                }
            } else {
                // Ville connue, toutes catégories
                pending = reportRepository.findPendingInBounds(bounds[0], bounds[1], bounds[2], bounds[3]);
            }
        } else if (categories != null) {
            // Ville inconnue mais catégories spécifiques
            for (String cat : categories) {
                pending.addAll(reportRepository.findPendingByCategory(cat.trim()));
            }
        } else {
            // Fallback texte
            pending = reportRepository.findPendingBySectorText(agent.getSecteur());
        }

        for (Report report : pending) {
            report.setAssignedAgentId(agent.getId());
            report.setAssignedAgentName(agent.getFullName());
            report.setSecteur(agent.getSecteur());
            reportRepository.update(report);
        }
        System.out.println("[ReportService] " + pending.size() + " signalement(s) PENDING assigné(s) à "
            + agent.getFullName() + " (secteur=" + agent.getSecteur() + ", catégories=" + cats + ")");
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
