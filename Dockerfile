# Multi-stage build
FROM openjdk:17-slim AS builder

# Install dependencies
RUN apt-get update && apt-get install -y curl tar bash procps && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Maven wrapper
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Make mvnw executable
RUN chmod +x mvnw

# Download dependencies (cached)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Build application
RUN ./mvnw clean package -DskipTests

# ============================================
# Production stage
# ============================================
FROM openjdk:17-slim

# Install MySQL client for health checks (optional)
RUN apt-get update && apt-get install -y mysql-client curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system spring && adduser --system --ingroup spring spring
USER spring:spring

# Set working directory
WORKDIR /app

# Copy JAR from builder
COPY --from=builder --chown=spring:spring /app/target/shareview-backend-*.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run with optimization flags
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]