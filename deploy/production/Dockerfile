FROM eclipse-temurin:21-jre
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 rehaconnect && useradd --uid 10001 --gid 10001 --no-create-home rehaconnect
WORKDIR /app
RUN mkdir -p /app/data && chown 10001:10001 /app/data
COPY backend/rehaconnect-api/target/rehaconnect-api-1.0.0.jar /app/rehaconnect.jar
USER 10001:10001
ENV SERVER_ADDRESS=0.0.0.0 REHACONNECT_PORT=4101 REHACONNECT_STORAGE_PATH=/app/data/clinics.bin
EXPOSE 4101
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 CMD curl --fail --silent http://127.0.0.1:4101/ > /dev/null || exit 1
ENTRYPOINT ["java", "-jar", "/app/rehaconnect.jar"]
