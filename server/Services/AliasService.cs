namespace Alsoright.Server.Services;

public static class AliasService
{
    private static readonly string[] Aliases =
    [
        "차분한고양이", "분노한토끼", "철학자감자", "행복한너구리",
        "냉정한여우", "수상한오리", "사색하는곰", "예리한늑대",
        "조용한참새", "엉뚱한판다", "용감한수달", "단호한사슴",
        "신중한독수리", "거침없는호랑이", "느긋한나무늘보", "날카로운까마귀",
        "수줍은다람쥐", "과감한늑대", "조심스러운오소리", "뚝심있는황소",
    ];

    private static readonly Random Rng = new();

    public static string Pick(IEnumerable<string> takenAliases)
    {
        var taken = new HashSet<string>(takenAliases);
        var available = Aliases.Where(a => !taken.Contains(a)).ToArray();
        if (available.Length == 0)
            return $"참가자{Rng.Next(100, 999)}";
        return available[Rng.Next(available.Length)];
    }
}
