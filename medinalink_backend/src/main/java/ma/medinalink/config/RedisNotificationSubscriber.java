package ma.medinalink.config;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.context.Initialized;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import ma.medinalink.resource.NotificationEndpoint;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPubSub;

/**
 * Démarre un thread abonné au canal Redis "medinalink:notifications".
 * Chaque instance WildFly reçoit tous les événements publiés et livre
 * localement au WebSocket si l'utilisateur est connecté sur ce nœud.
 *
 * Format du message Redis : "userId|texte du message"
 */
@ApplicationScoped
public class RedisNotificationSubscriber {

    public static final String CHANNEL = "medinalink:notifications";

    @Inject
    private RedisConfig redisConfig;

    // Déclenché au démarrage du contexte ApplicationScoped (CDI startup)
    public void onStart(@Observes @Initialized(ApplicationScoped.class) Object event) {
        if (!AppConfig.redisEnabled()) return;

        Thread thread = new Thread(this::subscribeLoop, "redis-ws-subscriber");
        thread.setDaemon(true);
        thread.start();
        System.out.println("[Redis Subscriber] Thread démarré, canal : " + CHANNEL);
    }

    private void subscribeLoop() {
        while (!Thread.currentThread().isInterrupted()) {
            if (!redisConfig.isAvailable()) {
                sleep(5000);
                continue;
            }
            try (Jedis jedis = redisConfig.getPool().getResource()) {
                jedis.subscribe(new JedisPubSub() {
                    @Override
                    public void onMessage(String channel, String payload) {
                        int sep = payload.indexOf('|');
                        if (sep == -1) return;
                        String userId  = payload.substring(0, sep);
                        String message = payload.substring(sep + 1);
                        NotificationEndpoint.deliverLocal(userId, message);
                    }
                }, CHANNEL);
            } catch (Exception e) {
                System.err.println("[Redis Subscriber] Reconnexion dans 5s : " + e.getMessage());
                sleep(5000);
            }
        }
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); }
        catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
    }
}
