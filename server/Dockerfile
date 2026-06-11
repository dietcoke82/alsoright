FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["Alsoright.Server.csproj", "./"]
RUN dotnet restore "Alsoright.Server.csproj"

COPY . .
RUN dotnet publish "Alsoright.Server.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "Alsoright.Server.dll"]
