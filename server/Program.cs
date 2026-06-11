using Alsoright.Server.Data;
using Alsoright.Server.Hubs;
using Alsoright.Server.Services;
using Alsoright.Server.Dtos;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .SetIsOriginAllowed(_ => true);
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var provider = builder.Configuration["DatabaseProvider"] ?? "SqlServer";
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

    if (provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
    {
        options.UseNpgsql(
            connectionString ?? throw new InvalidOperationException("DefaultConnection is not configured."));
    }
    else if (provider.Equals("MySql", StringComparison.OrdinalIgnoreCase))
    {
        options.UseMySql(
            connectionString ?? throw new InvalidOperationException("DefaultConnection is not configured."),
            new MySqlServerVersion(new Version(8, 0, 34)));
    }
    else if (provider.Equals("InMemory", StringComparison.OrdinalIgnoreCase))
    {
        options.UseInMemoryDatabase("alsoright");
    }
    else
    {
        options.UseSqlServer(
            connectionString ?? throw new InvalidOperationException("DefaultConnection is not configured."));
    }
});

builder.Services.AddSingleton<GameStateService>();
builder.Services.AddSingleton<OnlineCountService>();
builder.Services.AddHostedService<CleanupService>();

var app = builder.Build();

// Create schema
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    // 컬럼 누락 시 자동 추가 (EnsureCreated는 기존 테이블 변경 안 함)
    db.Database.ExecuteSqlRaw(
        "ALTER TABLE \"Rooms\" ADD COLUMN IF NOT EXISTS \"MinPlayers\" integer NOT NULL DEFAULT 2");
    db.Database.ExecuteSqlRaw(
        "ALTER TABLE \"Players\" ADD COLUMN IF NOT EXISTS \"Uid\" text");
}

app.UseCors("DefaultCorsPolicy");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseRouting();
app.UseAuthorization();

app.MapControllers();
app.MapHub<GameHub>("/gamehub");
app.MapHub<LobbyHub>("/lobbyhub");

app.Run();
