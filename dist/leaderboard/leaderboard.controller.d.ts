import { LeaderboardService } from './leaderboard.service';
export declare class LeaderboardController {
    private readonly leaderboardService;
    constructor(leaderboardService: LeaderboardService);
    getLeaderboard(tournamentId: number): Promise<{
        success: boolean;
        data: never[];
        message: string;
    } | {
        success: boolean;
        data: {
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
        };
        message?: undefined;
    }>;
}
