# ── Stage 1 : Build Maven ───────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B -q

COPY src ./src
RUN mvn -B clean package -DskipTests -q

# ── Stage 2 : WildFly download (couche mise en cache séparément) ─
FROM eclipse-temurin:21-jre-jammy AS wildfly-base

ENV WILDFLY_VERSION=32.0.0.Final \
    JBOSS_HOME=/opt/wildfly

RUN apt-get update -q && \
    apt-get install -y -q --no-install-recommends wget unzip && \
    wget -q "https://github.com/wildfly/wildfly/releases/download/${WILDFLY_VERSION}/wildfly-${WILDFLY_VERSION}.zip" \
         -O /tmp/wildfly.zip && \
    unzip -q /tmp/wildfly.zip -d /opt && \
    mv /opt/wildfly-${WILDFLY_VERSION} ${JBOSS_HOME} && \
    rm /tmp/wildfly.zip && \
    apt-get purge -y --auto-remove wget unzip && \
    rm -rf /var/lib/apt/lists/*

# ── Stage 3 : Runtime final ──────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy

ENV JBOSS_HOME=/opt/wildfly

COPY --from=wildfly-base ${JBOSS_HOME} ${JBOSS_HOME}

# Driver PostgreSQL depuis le cache Maven du stage 1
COPY --from=build /root/.m2/repository/org/postgresql/postgresql/42.7.1/postgresql-42.7.1.jar /tmp/

# Configurer WildFly (driver + datasource) une seule fois au build
COPY docker/configure-wildfly.cli /tmp/
RUN ${JBOSS_HOME}/bin/jboss-cli.sh --file=/tmp/configure-wildfly.cli && \
    rm -f /tmp/configure-wildfly.cli /tmp/postgresql-42.7.1.jar

# Déployer le WAR
COPY --from=build /app/target/medinalink.war ${JBOSS_HOME}/standalone/deployments/

EXPOSE 8080 9990

CMD ["/opt/wildfly/bin/standalone.sh", "-b", "0.0.0.0", "-bmanagement", "0.0.0.0"]
