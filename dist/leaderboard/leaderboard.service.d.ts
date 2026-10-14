export declare class LeaderboardService {
    private readonly db;
    constructor(db: any);
    getLeaderboard(tournamentId: number): Promise<{
        tournament: any;
        leaderboard: {
            userId: number;
            name: string;
            wins: number;
            losses: number;
            draws: number;
            points: number;
            rank: number;
        }[];
    }>;
}
