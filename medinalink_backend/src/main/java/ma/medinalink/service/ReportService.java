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
import ma.medinalink.entity.Notification;
import ma.medinalink.entity.ReportComment;
import ma.medinalink.repository.AiInteractionRepository;
import ma.medinalink.repository.NotificationRepository;
import ma.medinalink.repository.PriorityRepository;
import ma.medinalink.repository.ReportCommentRepository;
import ma.medinalink.repository.ReportRepository;
import ma.medinalink.repository.ReportStatusHistoryRepository;
import ma.medinalink.repository.ReportVoteRepository;
import ma.medinalink.repository.UserRepository;
import ma.medinalink.resource.NotificationEndpoint;

import jakarta.transaction.Transactional;
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
        CITY_BOUNDS.put("taourirt",    new double[]{34.36, 34.46, -2.95, -2.82});
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

    // Détecte la ville depuis le texte d'adresse (fallback quand GPS absent/hors bbox)
    private String detectCityFromAddress(String address) {
        if (address == null || address.isBlank()) return null;
        String norm = normalize(address);
        for (String city : CITY_BOUNDS.keySet()) {
            if (norm.contains(city)) return city;
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

    @Inject
    private ReportCommentRepository commentRepository;

    @Inject
    private NotificationRepository notificationRepository;

    @Inject
    private ReportVoteRepository voteRepository;

    public ReportResponse create(ReportRequest request, UUID userId) {

        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new BadRequestException("Le titre est obligatoire");
        }
        if ((request.getLongitude() == null || request.getLatitude() == null)
                && (request.getAddress() == null || request.getAddress().isBlank())) {
            throw new BadRequestException("Veuillez saisir une adresse ou utiliser la géolocalisation");
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

        String detectedCity = null;
        if (request.getLatitude() != null && request.getLongitude() != null) {
            detectedCity = detectCity(request.getLatitude(), request.getLongitude());
        }
        if (detectedCity == null) {
            detectedCity = detectCityFromAddress(request.getAddress());
        }
        if (detectedCity == null && user.getCity() != null) {
            detectedCity = normalize(user.getCity());
        }
        report.setDetectedCity(detectedCity);

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

            // Priorité 1 : GPS bounding box
            String detectedCity = (report.getLatitude() != null && report.getLongitude() != null)
                ? detectCity(report.getLatitude(), report.getLongitude()) : null;
            // Priorité 2 : adresse texte
            if (detectedCity == null) detectedCity = detectCityFromAddress(report.getAddress());
            // Priorité 3 : ville du citoyen
            if (detectedCity == null && report.getUser() != null) detectedCity = normalize(report.getUser().getCity());

            final String city = detectedCity;
            String category = report.getCategory();

            if (city == null) {
                System.out.println("[ReportService] Ville non détectée pour le signalement " + report.getId() + " — non assigné");
                return;
            }

            // Agents couvrant exactement cette ville
            List<User> cityAgents = allAgents.stream()
                .filter(a -> city.equals(normalize(a.getSecteur())))
                .collect(Collectors.toList());

            // Aucun agent dans cette ville → pas d'assignation
            if (cityAgents.isEmpty()) {
                System.out.println("[ReportService] Aucun agent pour la ville " + city + " — non assigné");
                return;
            }

            // Parmi les agents de la ville, préférer ceux qui couvrent la catégorie
            List<User> specialized = cityAgents.stream()
                .filter(a -> agentHandlesCategory(a, category))
                .collect(Collectors.toList());
            List<User> candidates = specialized.isEmpty() ? cityAgents : specialized;

            // Choisir le plus proche GPS (ou le premier si pas de coords)
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
        return findAll(page, size, status, category, agentId, null);
    }

    public List<ReportResponse> findAll(int page, int size, String status, String category, UUID agentId, String city) {
        return findAll(page, size, status, category, agentId, city, null);
    }

    public List<ReportResponse> findAll(int page, int size, String status, String category, UUID agentId, String city, String agentSecteur) {
        List<Report> reports = agentId != null
            ? reportRepository.findByAgentId(agentId, agentSecteur, page, size, status, category)
            : reportRepository.findAll(page, size, status, category, city);
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

        // Notification citoyen (WebSocket + persistante en DB)
        if (updated.getUser() != null) {
            UUID citizenId = updated.getUser().getId();
            String msg = switch (newStatus) {
                case "IN_PROGRESS" -> "Votre signalement \"" + updated.getTitle() + "\" est en cours de traitement.";
                case "RESOLVED"    -> "Votre signalement \"" + updated.getTitle() + "\" a été résolu !";
                case "REJECTED"    -> "Votre signalement \"" + updated.getTitle() + "\" a été rejeté.";
                default            -> "Statut de votre signalement mis à jour.";
            };
            saveNotification(citizenId, updated.getId(), updated.getTitle(), msg, "STATUS_CHANGE");
            NotificationEndpoint.notifyUser(citizenId.toString(), msg);
        }

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

    public ReportResponse upvote(UUID id, UUID userId) {
        if (voteRepository.hasVoted(userId, id)) {
            throw new BadRequestException("Vous avez déjà voté pour ce signalement");
        }
        voteRepository.save(userId, id);
        Report updated = reportRepository.upvoteIncrement(id);
        if (updated == null) throw new NotFoundException("Signalement non trouvé");
        return toResponse(updated);
    }

    public List<UUID> getMyVotes(UUID userId) {
        return voteRepository.findReportIdsByUser(userId);
    }

    public List<java.util.Map<String, Object>> getComments(UUID reportId) {
        return commentRepository.findByReportId(reportId).stream().map(c -> {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id",          c.getId());
            m.put("authorName",  c.getAuthorName());
            m.put("authorRole",  c.getAuthorRole());
            m.put("content",     c.getContent());
            m.put("createdAt",   c.getCreatedAt());
            return m;
        }).collect(Collectors.toList());
    }

    @Transactional
    public java.util.Map<String, Object> addComment(UUID reportId, UUID userId, String content) {
        if (content == null || content.isBlank()) throw new BadRequestException("Le commentaire ne peut pas être vide");
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new NotFoundException("Signalement non trouvé"));
        User author = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé"));

        ReportComment comment = new ReportComment();
        comment.setReportId(reportId);
        comment.setUserId(userId);
        comment.setAuthorName(author.getFullName());
        comment.setAuthorRole(author.getRole().name());
        comment.setContent(content.trim());
        commentRepository.save(comment);

        // Notification : si commentaire d'un agent → notifier le citoyen, sinon notifier l'agent assigné
        try {
            UUID notifyTarget = null;
            if (author.getRole().name().equals("CITIZEN") && report.getAssignedAgentId() != null) {
                notifyTarget = report.getAssignedAgentId();
            } else if (!author.getRole().name().equals("CITIZEN") && report.getUser() != null) {
                notifyTarget = report.getUser().getId();
            }
            if (notifyTarget != null) {
                String msg = author.getFullName() + " a commenté : \"" + report.getTitle() + "\"";
                saveNotification(notifyTarget, reportId, report.getTitle(), msg, "COMMENT");
                NotificationEndpoint.notifyUser(notifyTarget.toString(), msg);
            }
        } catch (Exception ignored) {}

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id",         comment.getId());
        result.put("authorName", comment.getAuthorName());
        result.put("authorRole", comment.getAuthorRole());
        result.put("content",    comment.getContent());
        result.put("createdAt",  comment.getCreatedAt());
        return result;
    }

    public ReportResponse updateResolutionPhoto(UUID id, String photoBase64) {
        Report report = reportRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Signalement non trouvé"));
        report.setResolutionPhotoUrl(photoBase64);
        return toResponse(reportRepository.update(report));
    }

    private void saveNotification(UUID userId, UUID reportId, String reportTitle, String message, String type) {
        try {
            Notification n = new Notification();
            n.setUserId(userId);
            n.setReportId(reportId);
            n.setReportTitle(reportTitle);
            n.setMessage(message);
            n.setType(type);
            notificationRepository.save(n);
        } catch (Exception e) {
            System.err.println("[Notification] Erreur sauvegarde : " + e.getMessage());
        }
    }

    public int assignPendingReportsToAgent(User agent) {
        if (agent.getSecteur() == null || agent.getSecteur().isBlank()) return 0;

        String cityKey = normalize(agent.getSecteur());
        double[] bounds = CITY_BOUNDS.get(cityKey);

        // Ville non reconnue dans notre carte → on n'assigne rien pour éviter des faux positifs
        if (bounds == null) {
            System.out.println("[ReportService] Ville « " + agent.getSecteur() + " » non trouvée dans la carte — aucune réassignation");
            return 0;
        }

        String cats = agent.getAgentCategories();
        String[] categories = (cats != null && !cats.isBlank()) ? cats.split(",") : null;

        List<Report> pending = new java.util.ArrayList<>();

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

    public ReportResponse unassign(UUID reportId) {
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new NotFoundException("Signalement non trouvé"));
        report.setAssignedAgentId(null);
        report.setAssignedAgentName(null);
        report.setSecteur(null);
        if ("IN_PROGRESS".equals(report.getStatus())) {
            report.setStatus("PENDING");
        }
        return toResponse(reportRepository.update(report));
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

        ReportResponse resp = new ReportResponse(
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
        resp.setDetectedCity(report.getDetectedCity());
        resp.setResolutionPhotoUrl(report.getResolutionPhotoUrl());
        try { resp.setCommentCount((int) commentRepository.countByReportId(report.getId())); } catch (Exception ignored) {}
        return resp;
    }
}
