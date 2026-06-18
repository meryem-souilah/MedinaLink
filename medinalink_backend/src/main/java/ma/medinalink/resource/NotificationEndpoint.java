package ma.medinalink.resource;

import jakarta.enterprise.inject.spi.CDI;
import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;
import ma.medinalink.config.AppConfig;
import ma.medinalink.config.RedisConfig;
import ma.medinalink.config.RedisNotificationSubscriber;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/ws/notifications/{userId}")
public class NotificationEndpoint {

    // Sessions WebSocket actives sur CE nœud
    static final Map<String, Session> sessions = new ConcurrentHashMap<>();

    @OnOpen
    public void onOpen(Session session, @PathParam("userId") String userId) {
        sessions.put(userId, session);
        System.out.println("[WS] Ouvert userId=" + userId);
    }

    @OnClose
    public void onClose(@PathParam("userId") String userId) {
        sessions.remove(userId);
        System.out.println("[WS] Fermé userId=" + userId);
    }

    @OnError
    public void onError(@PathParam("userId") String userId, Throwable error) {
        sessions.remove(userId);
        System.err.println("[WS] Erreur userId=" + userId + " : " + error.getMessage());
    }

    /**
     * Point d'entrée principal appelé depuis ReportService.
     *
     * Stratégie :
     *  - Si Redis est actif  → publish sur le canal "medinalink:notifications"
     *    → chaque nœud reçoit l'événement et livre localement via deliverLocal()
     *  - Si Redis est inactif → livraison directe en mémoire (instance unique)
     */
    public static void notifyUser(String userId, String message) {
        if (AppConfig.redisEnabled()) {
            try {
                RedisConfig redis = CDI.current().select(RedisConfig.class).get();
                if (redis.isAvailable()) {
                    redis.publish(RedisNotificationSubscriber.CHANNEL,
                                  userId + "|" + message);
                    return;
                }
            } catch (Exception e) {
                System.err.println("[WS] Redis indisponible, livraison locale : " + e.getMessage());
            }
        }
        // Fallback : livraison directe (mode mono-instance)
        deliverLocal(userId, message);
    }

    /**
     * Livre un message au WebSocket local de cet utilisateur s'il est connecté
     * sur CE nœud. Appelé par RedisNotificationSubscriber sur chaque nœud.
     */
    public static void deliverLocal(String userId, String message) {
        Session session = sessions.get(userId);
        if (session != null && session.isOpen()) {
            session.getAsyncRemote().sendText(message);
        }
    }

    /**
     * Diffuse un message à TOUS les utilisateurs connectés sur ce nœud.
     */
    public static void notifyAll(String message) {
        sessions.forEach((userId, session) -> {
            if (session.isOpen()) {
                session.getAsyncRemote().sendText(message);
            }
        });
    }
}
