package ma.medinalink.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import ma.medinalink.entity.Commune;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class CommuneRepository {

    @PersistenceContext(unitName = "medinalinkPU")
    private EntityManager em;

    public Optional<Commune> findById(UUID id) {
        Commune commune = em.find(Commune.class, id);
        return Optional.ofNullable(commune);
    }
}
