/**
 * Tower of Fate V2.0 - World Tournament Data
 * 196 countries data for global tournament system
 * Reused from V1.0 + Web4.0 enhancements
 */

const WORLD_TOURNAMENT_DATA = {
    version: "2.0",
    totalCountries: 196,
    lastUpdated: "2026-03-10",

    // Hot countries (48 key markets)
    hotCountries: [
        "CN", "US", "JP", "KR", "GB", "DE", "FR", "RU", "BR", "IN",
        "AU", "CA", "IT", "ES", "MX", "ID", "NL", "SA", "TR", "TW",
        "TH", "VN", "MY", "PH", "SG", "AE", "ZA", "EG", "NG", "KE",
        "AR", "CL", "CO", "PE", "VE", "SE", "NO", "DK", "FI", "PL",
        "UA", "CZ", "HU", "RO", "GR", "PT", "BE", "AT"
    ],

    // Country data (core countries with entry fees based on market size)
    countries: {
        // Asia
        CN: { name: "\u4e2d\u56fd", flag: "\ud83c\udde8\ud83c\uddf3", region: "asia", difficulty: 8, entryFee: 100, population: 1411778724, gdp: 17734062645350 },
        JP: { name: "\u65e5\u672c", flag: "\ud83c\uddef\ud83c\uddf5", region: "asia", difficulty: 7, entryFee: 80, population: 125681593, gdp: 1807425534834 },
        KR: { name: "\u97e9\u56fd", flag: "\ud83c\uddf0\ud83c\uddf7", region: "asia", difficulty: 7, entryFee: 70, population: 51744876, gdp: 1807425534834 },
        IN: { name: "\u5370\u5ea6", flag: "\ud83c\uddee\ud83c\uddf3", region: "asia", difficulty: 5, entryFee: 30, population: 1393409038, gdp: 3173399884245 },
        ID: { name: "\u5370\u5c3c", flag: "\ud83c\uddee\ud83c\udde9", region: "asia", difficulty: 4, entryFee: 25, population: 276361783, gdp: 1185803714312 },
        TH: { name: "\u6cf0\u56fd", flag: "\ud83c\uddf9\ud83c\udded", region: "asia", difficulty: 4, entryFee: 25, population: 69950850, gdp: 505947026288 },
        VN: { name: "\u8d8a\u5357", flag: "\ud83c\uddfb\ud83c\uddf3", region: "asia", difficulty: 4, entryFee: 20, population: 98186856, gdp: 366136026891 },
        MY: { name: "\u9a6c\u6765\u897f\u4e9a", flag: "\ud83c\uddf2\ud83c\uddfe", region: "asia", difficulty: 5, entryFee: 30, population: 33199993, gdp: 372980978771 },
        PH: { name: "\u83f2\u5f8b\u5bbe", flag: "\ud83c\uddf5\ud83c\udded", region: "asia", difficulty: 3, entryFee: 15, population: 113880328, gdp: 394086363536 },
        SG: { name: "\u65b0\u52a0\u5761", flag: "\ud83c\uddf8\ud83c\uddec", region: "asia", difficulty: 6, entryFee: 50, population: 5637000, gdp: 396987170528 },
        TW: { name: "\u4e2d\u56fd\u53f0\u6e7e", flag: "\ud83c\uddf9\ud83c\uddfc", region: "asia", difficulty: 6, entryFee: 45, population: 23570000, gdp: 774857819098 },

        // North America
        US: { name: "\u7f8e\u56fd", flag: "\ud83c\uddfa\ud83c\uddf8", region: "north_america", difficulty: 8, entryFee: 100, population: 331893745, gdp: 23315080556000 },
        CA: { name: "\u52a0\u62ff\u5927", flag: "\ud83c\udde8\ud83c\udde6", region: "north_america", difficulty: 6, entryFee: 60, population: 38246108, gdp: 1990762132000 },
        MX: { name: "\u58a8\u897f\u54e5", flag: "\ud83c\uddf2\ud83c\uddfd", region: "north_america", difficulty: 4, entryFee: 25, population: 126705138, gdp: 1293157728000 },

        // Europe
        GB: { name: "\u82f1\u56fd", flag: "\ud83c\uddec\ud83c\udde7", region: "europe", difficulty: 7, entryFee: 75, population: 67326569, gdp: 3186863337000 },
        DE: { name: "\u5fb7\u56fd", flag: "\ud83c\udde9\ud83c\uddea", region: "europe", difficulty: 7, entryFee: 75, population: 83240525, gdp: 4259934912000 },
        FR: { name: "\u6cd5\u56fd", flag: "\ud83c\uddeb\ud83c\uddf7", region: "europe", difficulty: 6, entryFee: 70, population: 67749632, gdp: 2938274184000 },
        IT: { name: "\u610f\u5927\u5229", flag: "\ud83c\uddee\ud83c\uddf9", region: "europe", difficulty: 6, entryFee: 65, population: 59109668, gdp: 2107700676000 },
        ES: { name: "\u897f\u73ed\u7259", flag: "\ud83c\uddea\ud83c\uddf8", region: "europe", difficulty: 5, entryFee: 55, population: 47420568, gdp: 1427384507000 },
        NL: { name: "\u8377\u5170", flag: "\ud83c\uddf3\ud83c\uddf1", region: "europe", difficulty: 6, entryFee: 60, population: 17441139, gdp: 1012733315000 },
        SE: { name: "\u745e\u5178", flag: "\ud83c\uddf8\ud83c\uddea", region: "europe", difficulty: 6, entryFee: 55, population: 10415811, gdp: 627437203000 },
        NO: { name: "\u632a\u5a01", flag: "\ud83c\uddf3\ud83c\uddf4", region: "europe", difficulty: 6, entryFee: 50, population: 5408320, gdp: 482173628000 },
        PL: { name: "\u6ce2\u5170", flag: "\ud83c\uddf5\ud83c\uddf1", region: "europe", difficulty: 5, entryFee: 40, population: 37958138, gdp: 679444721000 },
        TR: { name: "\u571f\u8033\u5176", flag: "\ud83c\uddf9\ud83c\uddf7", region: "europe", difficulty: 4, entryFee: 30, population: 84680273, gdp: 819034483000 },

        // South America
        BR: { name: "\u5df4\u897f", flag: "\ud83c\udde7\ud83c\uddf7", region: "south_america", difficulty: 5, entryFee: 35, population: 214326223, gdp: 1608981868000 },
        AR: { name: "\u963f\u6839\u5ef7", flag: "\ud83c\udde6\ud83c\uddf7", region: "south_america", difficulty: 4, entryFee: 25, population: 45808747, gdp: 487223273000 },
        CL: { name: "\u667a\u5229", flag: "\ud83c\udde8\ud83c\uddf1", region: "south_america", difficulty: 4, entryFee: 30, population: 19678363, gdp: 316764453000 },
        CO: { name: "\u54e5\u4f26\u6bd4\u4e9a", flag: "\ud83c\udde8\ud83c\uddf4", region: "south_america", difficulty: 3, entryFee: 20, population: 51487000, gdp: 314457649000 },

        // Oceania
        AU: { name: "\u6fb3\u5927\u5229\u4e9a", flag: "\ud83c\udde6\ud83c\uddfa", region: "oceania", difficulty: 6, entryFee: 60, population: 25687041, gdp: 1542059364000 },

        // Middle East
        SA: { name: "\u6c99\u7279\u963f\u62c9\u4f2f", flag: "\ud83c\uddf8\ud83c\udde6", region: "middle_east", difficulty: 5, entryFee: 50, population: 35340683, gdp: 833541216000 },
        AE: { name: "\u963f\u8054\u914b", flag: "\ud83c\udde6\ud83c\uddea", region: "middle_east", difficulty: 6, entryFee: 55, population: 9991000, gdp: 358868765000 },

        // Africa
        ZA: { name: "\u5357\u975e", flag: "\ud83c\uddff\ud83c\udde6", region: "africa", difficulty: 3, entryFee: 20, population: 60041996, gdp: 419946508000 },
        EG: { name: "\u57c3\u53ca", flag: "\ud83c\uddea\ud83c\uddec", region: "africa", difficulty: 3, entryFee: 15, population: 109262178, gdp: 404142768000 },
        NG: { name: "\u5c3c\u65e5\u5229\u4e9a", flag: "\ud83c\uddf3\ud83c\uddec", region: "africa", difficulty: 2, entryFee: 10, population: 213401323, gdp: 440833583000 },
        KE: { name: "\u80af\u5c3c\u4e9a", flag: "\ud83c\uddf0\ud83c\uddea", region: "africa", difficulty: 2, entryFee: 10, population: 53005614, gdp: 110347079000 }
    },

    // Tournament tiers based on difficulty
    tiers: {
        beginner: { minDifficulty: 1, maxDifficulty: 3, prizeMultiplier: 1 },
        intermediate: { minDifficulty: 4, maxDifficulty: 6, prizeMultiplier: 2 },
        advanced: { minDifficulty: 7, maxDifficulty: 8, prizeMultiplier: 5 },
        master: { minDifficulty: 9, maxDifficulty: 10, prizeMultiplier: 10 }
    },

    // Prize distribution
    prizeDistribution: {
        first: 0.50,
        second: 0.25,
        third: 0.15,
        fourth: 0.10
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WORLD_TOURNAMENT_DATA;
}
