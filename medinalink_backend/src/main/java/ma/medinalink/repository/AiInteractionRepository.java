package ma.medinalink.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import ma.medinalink.entity.AiInteraction;

@ApplicationScoped
public class AiInteractionRepository {

    @PersistenceContext(unitName = "medinalinkPU")
    private EntityManager em;

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void save(AiInteraction interaction) {
        em.persist(interaction);
        em.flush();
    }
}
