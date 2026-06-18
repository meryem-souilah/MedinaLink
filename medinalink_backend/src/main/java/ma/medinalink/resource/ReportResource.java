package ma.medinalink.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ma.medinalink.config.Secured;
import ma.medinalink.dto.ReportRequest;
import ma.medinalink.service.JwtService;
import ma.medinalink.service.ReportService;

import java.util.Map;
import java.util.UUID;

@Path("/reports")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReportResource {

    @Inject
    private ReportService reportService;

    @Inject
    private JwtService jwtService;

    @POST
    @Secured
    public Response create(ReportRequest request, @Context HttpHeaders headers) {
        try {
            UUID userId = getUserIdFromHeader(headers);
            var response = reportService.create(request, userId);
            return Response.status(Response.Status.CREATED).entity(response).build();
        } catch (BadRequestException e) {
            return Response.status(400).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", "Erreur : " + e.getMessage())).build();
        }
    }

    @GET
    public Response findAll(
            @QueryParam("page")     @DefaultValue("0")  int page,
            @QueryParam("size")     @DefaultValue("20") int size,
            @QueryParam("status")   String status,
            @QueryParam("category") String category,
            @QueryParam("agentId")  String agentIdStr) {
        try {
            UUID agentId = (agentIdStr != null && !agentIdStr.isBlank()) ? UUID.fromString(agentIdStr) : null;
            var reports = reportService.findAll(page, size, status, category, agentId);
            return Response.ok(reports).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @GET
    @Path("/stats")
    public Response getStats(@QueryParam("agentId") String agentIdStr) {
        try {
            UUID agentId = (agentIdStr != null && !agentIdStr.isBlank()) ? UUID.fromString(agentIdStr) : null;
            return Response.ok(reportService.getStats(agentId)).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @GET
    @Path("/nearby")
    public Response findNearby(
            @QueryParam("lng") double lng,
            @QueryParam("lat") double lat,
            @QueryParam("radius") @DefaultValue("1000") double radius) {
        try {
            var reports = reportService.findNearby(lng, lat, radius);
            return Response.ok(reports).build();
        } catch (BadRequestException e) {
            return Response.status(400).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @GET
    @Path("/{id}")
    public Response findById(@PathParam("id") UUID id) {
        try {
            var report = reportService.findById(id);
            return Response.ok(report).build();
        } catch (NotFoundException e) {
            return Response.status(404).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    // -------------------------------------------------------
    // PUT /api/v1/reports/{id}/status
    // Body : { "status": "IN_PROGRESS" }
    // -------------------------------------------------------
    @PUT
    @Path("/{id}/status")
    @Secured
    public Response updateStatus(
            @PathParam("id") UUID id,
            Map<String, String> body,
            @Context HttpHeaders headers) {
        try {
            String newStatus = body.get("status");
            UUID agentId = getUserIdFromHeader(headers);
            var report = reportService.updateStatus(id, newStatus, agentId);
            return Response.ok(report).build();
        } catch (BadRequestException e) {
            return Response.status(400).entity(Map.of("message", e.getMessage())).build();
        } catch (NotFoundException e) {
            return Response.status(404).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    // -------------------------------------------------------
    // PUT /api/v1/reports/{id}/notes
    // Body : { "notes": "..." }
    // -------------------------------------------------------
    @PUT
    @Path("/{id}/notes")
    @Secured
    public Response updateNotes(@PathParam("id") UUID id, Map<String, String> body) {
        try {
            String notes = body.getOrDefault("notes", "");
            var report = reportService.updateNotes(id, notes);
            return Response.ok(report).build();
        } catch (NotFoundException e) {
            return Response.status(404).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    // -------------------------------------------------------
    // GET /api/v1/reports/{id}/history
    // -------------------------------------------------------
    @GET
    @Path("/{id}/history")
    @Secured
    public Response getStatusHistory(@PathParam("id") UUID id) {
        try {
            var history = reportService.getStatusHistory(id);
            return Response.ok(history).build();
        } catch (NotFoundException e) {
            return Response.status(404).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    // -------------------------------------------------------
    // PUT /api/v1/reports/{id}/priority
    // Body : { "priorityId": "uuid" }  (null pour délier)
    // -------------------------------------------------------
    @PUT
    @Path("/{id}/priority")
    @Secured
    public Response linkPriority(@PathParam("id") UUID id, Map<String, String> body) {
        try {
            String raw = body.get("priorityId");
            UUID priorityId = (raw != null && !raw.isBlank()) ? UUID.fromString(raw) : null;
            var report = reportService.linkPriority(id, priorityId);
            return Response.ok(report).build();
        } catch (NotFoundException e) {
            return Response.status(404).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    // -------------------------------------------------------
    // POST /api/v1/reports/{id}/upvote
    // -------------------------------------------------------
    @POST
    @Path("/{id}/upvote")
    @Secured
    public Response upvote(@PathParam("id") UUID id) {
        try {
            var report = reportService.upvote(id);
            return Response.ok(report).build();
        } catch (NotFoundException e) {
            return Response.status(404).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    private UUID getUserIdFromHeader(HttpHeaders headers) {
        String authHeader = headers.getHeaderString(HttpHeaders.AUTHORIZATION);
        String token = authHeader.substring(7);
        return jwtService.getUserIdFromToken(token);
    }
}
