export declare class MatchmakingService {
    private readonly db;
    constructor(db: any);
    findOpponent(tournamentId: number, studentId: number): Promise<any>;
}
