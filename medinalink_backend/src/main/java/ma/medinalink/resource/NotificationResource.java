package ma.medinalink.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ma.medinalink.config.Secured;
import ma.medinalink.entity.Notification;
import ma.medinalink.repository.NotificationRepository;
import ma.medinalink.service.JwtService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/notifications")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Secured
public class NotificationResource {

    @Inject
    private NotificationRepository notificationRepository;

    @Inject
    private JwtService jwtService;

    @GET
    @Path("/my")
    public Response getMy(@Context HttpHeaders headers) {
        try {
            UUID userId = getUserId(headers);
            List<Notification> notifs = notificationRepository.findByUserId(userId);
            long unread = notificationRepository.countUnread(userId);

            List<Map<String, Object>> list = notifs.stream().map(n -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",          n.getId());
                m.put("reportId",    n.getReportId());
                m.put("reportTitle", n.getReportTitle());
                m.put("message",     n.getMessage());
                m.put("type",        n.getType());
                m.put("isRead",      n.isRead());
                m.put("createdAt",   n.getCreatedAt());
                return m;
            }).collect(Collectors.toList());

            return Response.ok(Map.of("unreadCount", unread, "notifications", list)).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/read-all")
    public Response markAllRead(@Context HttpHeaders headers) {
        try {
            UUID userId = getUserId(headers);
            notificationRepository.markAllRead(userId);
            return Response.ok(Map.of("message", "Toutes les notifications marquées comme lues")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    private UUID getUserId(HttpHeaders headers) {
        String auth = headers.getHeaderString(HttpHeaders.AUTHORIZATION);
        return jwtService.getUserIdFromToken(auth.substring(7));
    }
}
