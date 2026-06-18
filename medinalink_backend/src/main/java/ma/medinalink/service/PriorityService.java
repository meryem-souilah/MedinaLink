package ma.medinalink.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import ma.medinalink.dto.PriorityRequest;
import ma.medinalink.dto.PriorityResponse;
import ma.medinalink.entity.Commune;
import ma.medinalink.entity.PriorityStatus;
import ma.medinalink.entity.PublicPriority;
import ma.medinalink.entity.User;
import ma.medinalink.repository.CommuneRepository;
import ma.medinalink.repository.PriorityRepository;
import ma.medinalink.repository.UserRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class PriorityService {

    @Inject
    private PriorityRepository priorityRepository;

    @Inject
    private UserRepository userRepository;

    @Inject
    private CommuneRepository communeRepository;

    public PriorityResponse create(PriorityRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new BadRequestException("Le titre est obligatoire");
        }

        PublicPriority priority = new PublicPriority();
        priority.setTitle(request.getTitle().trim());
        priority.setDescription(request.getDescription());
        priority.setCategory(request.getCategory() != null ? request.getCategory() : "GENERAL");
        priority.setZone(request.getZone());
        priority.setBudget(request.getBudget());
        priority.setProgress(0);

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            try {
                priority.setStatus(PriorityStatus.valueOf(request.getStatus()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Statut de priorité invalide");
            }
        }

        if (request.getStartDate() != null && !request.getStartDate().isBlank()) {
            try {
                priority.setStartDate(LocalDate.parse(request.getStartDate()));
            } catch (Exception e) {
                throw new BadRequestException("Date de début invalide");
            }
        }

        if (request.getEndDate() != null && !request.getEndDate().isBlank()) {
            try {
                priority.setEndDate(LocalDate.parse(request.getEndDate()));
            } catch (Exception e) {
                throw new BadRequestException("Date de fin invalide");
            }
        }

        if (request.getResponsibleId() != null && !request.getResponsibleId().isBlank()) {
            try {
                UUID responsibleId = UUID.fromString(request.getResponsibleId());
                User responsible = userRepository.findById(responsibleId)
                        .orElseThrow(() -> new BadRequestException("Responsable introuvable"));
                priority.setResponsible(responsible);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("ID du responsable invalide");
            }
        }

        if (request.getCommuneId() != null && !request.getCommuneId().isBlank()) {
            try {
                UUID communeId = UUID.fromString(request.getCommuneId());
                Commune commune = communeRepository.findById(communeId)
                        .orElseThrow(() -> new BadRequestException("Commune introuvable"));
                priority.setCommune(commune);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("ID de commune invalide");
            }
        }

        PublicPriority saved = priorityRepository.save(priority);
        return toResponse(saved);
    }

    public PriorityResponse findById(UUID id) {
        PublicPriority priority = priorityRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Priorité publique non trouvée"));
        return toResponse(priority);
    }

    public List<PriorityResponse> findAll(String status, UUID communeId, int page, int size) {
        return priorityRepository.findAll(status, communeId, page, size)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public PriorityResponse updateProgress(UUID id, int progress) {
        if (progress < 0 || progress > 100) {
            throw new BadRequestException("Le pourcentage doit être entre 0 et 100");
        }
        PublicPriority updated = priorityRepository.updateProgress(id, progress);
        if (updated == null) {
            throw new NotFoundException("Priorité publique non trouvée");
        }
        return toResponse(updated);
    }

    private PriorityResponse toResponse(PublicPriority priority) {
        String responsibleName = priority.getResponsible() != null
                ? priority.getResponsible().getFullName() : null;
        String communeName = priority.getCommune() != null
                ? priority.getCommune().getName() : null;

        return new PriorityResponse(
                priority.getId(),
                priority.getTitle(),
                priority.getDescription(),
                priority.getCategory(),
                priority.getStatus().name(),
                priority.getBudget(),
                priority.getZone(),
                priority.getProgress(),
                responsibleName,
                communeName,
                priority.getStartDate(),
                priority.getEndDate(),
                priority.getCreatedAt(),
                priority.getUpdatedAt()
        );
    }
}
