package ma.medinalink.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

@ApplicationScoped
public class RedisConfig {

    private JedisPool pool;

    @PostConstruct
    public void init() {
        if (!AppConfig.redisEnabled()) {
            System.out.println("[Redis] Redis désactivé (REDIS_ENABLED=false)");
            return;
        }
        try {
            JedisPoolConfig cfg = new JedisPoolConfig();
            cfg.setMaxTotal(10);
            cfg.setMaxIdle(5);
            cfg.setMinIdle(1);
            cfg.setTestOnBorrow(true);
            cfg.setTestOnReturn(true);

            String host     = AppConfig.redisHost();
            int    port     = AppConfig.redisPort();
            String password = AppConfig.redisPassword();

            boolean ssl = AppConfig.redisSsl();
            if (!password.isBlank()) {
                pool = new JedisPool(cfg, host, port, 2000, password, ssl);
            } else {
                pool = new JedisPool(cfg, host, port, 2000, null, ssl);
            }
            System.out.printf("[Redis] Pool connecté → %s:%d (ssl=%b)%n", host, port, ssl);
        } catch (Exception e) {
            System.err.println("[Redis] Connexion impossible : " + e.getMessage());
        }
    }

    @PreDestroy
    public void destroy() {
        if (pool != null && !pool.isClosed()) {
            pool.close();
        }
    }

    public boolean isAvailable() {
        return pool != null && !pool.isClosed();
    }

    public void publish(String channel, String message) {
        if (!isAvailable()) return;
        try (Jedis jedis = pool.getResource()) {
            jedis.publish(channel, message);
        } catch (Exception e) {
            System.err.println("[Redis] Publish échoué : " + e.getMessage());
        }
    }

    public JedisPool getPool() {
        return pool;
    }
}
