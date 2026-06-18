package ma.medinalink.config;

public final class AppConfig {

    private AppConfig() {}

    // --- JWT ---
    public static String jwtSecret() {
        String secret = env("MEDINALINK_JWT_SECRET",
                "medinalink-super-secret-key-2024-casablanca-maroc-jwt");
        if (secret.length() < 32) {
            throw new IllegalStateException(
                "MEDINALINK_JWT_SECRET must be at least 32 characters");
        }
        return secret;
    }

    // --- Redis ---
    public static String redisHost() {
        return env("REDIS_HOST", "localhost");
    }

    public static int redisPort() {
        try {
            return Integer.parseInt(env("REDIS_PORT", "6379"));
        } catch (NumberFormatException e) {
            return 6379;
        }
    }

    public static String redisPassword() {
        return env("REDIS_PASSWORD", "");
    }

    public static boolean redisEnabled() {
        return Boolean.parseBoolean(env("REDIS_ENABLED", "false"));
    }

    // --- AI microservice ---
    public static String aiServiceUrl() {
        return env("AI_SERVICE_URL", "http://localhost:5000");
    }

    // --- DB (documentation only — WildFly reads standalone.xml) ---
    public static String dbUrl() {
        return env("DB_URL", "jdbc:postgresql://localhost:5432/medinalink");
    }

    public static String dbUser() {
        return env("DB_USER", "medinalink");
    }

    public static String dbPassword() {
        return env("DB_PASSWORD", "medinalink");
    }

    // --- Helper ---
    private static String env(String key, String defaultValue) {
        String v = System.getenv(key);
        return (v != null && !v.isBlank()) ? v.trim() : defaultValue;
    }
}
