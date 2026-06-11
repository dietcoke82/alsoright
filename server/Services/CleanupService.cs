using Alsoright.Server.Data;
using Microsoft.EntityFrameworkCore;

namespace Alsoright.Server.Services;

public class CleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CleanupService> _logger;

    public CleanupService(IServiceScopeFactory scopeFactory, ILogger<CleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // 시작 후 10초 대기 (앱 완전히 뜬 후 실행)
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await RunCleanupAsync();
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }

    private async Task RunCleanupAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // AccessLog 90일 경과분 삭제
        var cutoff = DateTime.UtcNow.AddDays(-90);
        var deletedLogs = await db.AccessLogs
            .Where(l => l.CreatedAt < cutoff)
            .ExecuteDeleteAsync();

        if (deletedLogs > 0)
            _logger.LogInformation("AccessLog cleanup: {Count}건 삭제", deletedLogs);

        // Completed 방의 잔여 Player 정리 (타이머 외 경로로 남은 케이스)
        var deletedPlayers = await db.Players
            .Where(p => p.Room!.Status == Models.RoomStatus.Completed)
            .ExecuteDeleteAsync();

        if (deletedPlayers > 0)
            _logger.LogInformation("Player cleanup: {Count}건 삭제", deletedPlayers);
    }
}
