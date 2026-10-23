FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/ ./backend/
RUN --mount=type=secret,id=build_ca if [ -f /run/secrets/build_ca ]; then export SSL_CERT_FILE=/run/secrets/build_ca; fi; dotnet publish backend/AudioGuide.Api -c Release -o /out
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .
RUN mkdir media && chown -R app:app /app
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "AudioGuide.Api.dll"]
