package ma.medinalink.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ma.medinalink.config.Secured;
import ma.medinalink.dto.PriorityRequest;
import ma.medinalink.service.PriorityService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/priorities")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PriorityResource {

    @Inject
    private PriorityService priorityService;

    @GET
    public Response findAll(
            @QueryParam("status") String status,
            @QueryParam("communeId") String communeId,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        try {
            UUID communeUuid = null;
            if (communeId != null && !communeId.isBlank()) {
                communeUuid = UUID.fromString(communeId);
            }
            List<?> priorities = priorityService.findAll(status, communeUuid, page, size);
            return Response.ok(priorities).build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(Map.of("message", "ID de commune invalide")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @GET
    @Path("/{id}")
    public Response findById(@PathParam("id") UUID id) {
        try {
            var priority = priorityService.findById(id);
            return Response.ok(priority).build();
        } catch (NotFoundException e) {
            return Response.status(404).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @POST
    @Secured
    public Response create(PriorityRequest request) {
        try {
            var created = priorityService.create(request);
            return Response.status(Response.Status.CREATED).entity(created).build();
        } catch (BadRequestException e) {
            return Response.status(400).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/{id}/progress")
    @Secured
    public Response updateProgress(@PathParam("id") UUID id, Map<String, Integer> body) {
        try {
            Integer progress = body.get("progress");
            if (progress == null) {
                throw new BadRequestException("Le pourcentage est obligatoire");
            }
            var updated = priorityService.updateProgress(id, progress);
            return Response.ok(updated).build();
        } catch (BadRequestException e) {
            return Response.status(400).entity(Map.of("message", e.getMessage())).build();
        } catch (NotFoundException e) {
            return Response.status(404).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }
}
