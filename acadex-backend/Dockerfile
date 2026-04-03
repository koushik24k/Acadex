FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml ./
COPY src ./src
RUN mvn -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/acadex-backend-1.0.0.jar /app/app.jar
EXPOSE 10000
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-10000} -jar /app/app.jar"]
