// ============================================================
// Commune.java
// Chemin : src/main/java/ma/medinalink/entity/Commune.java
// ============================================================

package ma.medinalink.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "communes")
public class Commune {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;   // Ex: "Hay Hassani"

    @Column(name = "wilaya", nullable = false, length = 100)
    private String wilaya; // Ex: "Casablanca-Settat"

    public Commune() {}

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getWilaya() { return wilaya; }

    public void setId(UUID id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setWilaya(String wilaya) { this.wilaya = wilaya; }
}
