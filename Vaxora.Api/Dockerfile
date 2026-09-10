# Multi-stage Dockerfile for Vaxora.Api on Render / Linux Containers

# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["Vaxora.Api.csproj", "./"]
RUN dotnet restore "./Vaxora.Api.csproj"

# Copy full source and publish release build
COPY . .
RUN dotnet publish "Vaxora.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime Image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install fontconfig and native dependencies for QuestPDF / SkiaSharp on Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    libfontconfig1 \
    libfreetype6 \
    libx11-6 \
    libgdiplus \
    && rm -rf /var/lib/apt/lists/*

# Expose default HTTP port
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Vaxora.Api.dll"]
