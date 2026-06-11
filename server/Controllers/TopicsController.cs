using Alsoright.Server.Data;
using Alsoright.Server.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alsoright.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TopicsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public TopicsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetTopics()
    {
        var topics = await _dbContext.Topics
            .AsNoTracking()
            .OrderByDescending(t => t.Heat)
            .Select(t => TopicDto.From(t))
            .ToListAsync();

        return Ok(topics);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTopic(int id)
    {
        var topic = await _dbContext.Topics
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

        if (topic == null) return NotFound();

        return Ok(TopicDto.From(topic));
    }
}
