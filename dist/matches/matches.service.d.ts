export declare class MatchesService {
    private readonly db;
    constructor(db: any);
    getMatch(matchId: number): Promise<any>;
    getPlayerMatch(matchId: number, userId: number): Promise<any>;
    makeMove(matchId: number, userId: number, from: string, to: string, promotion?: string): Promise<{
        match: any;
        move: {
            from: import("chess.js").Square;
            to: import("chess.js").Square;
            san: string;
            color: import("chess.js").Color;
        };
        gameOver: boolean;
        result: "white_win" | "black_win" | "draw" | null;
        fen: string;
        pgn: string;
    }>;
    getMatchHistory(userId: number): Promise<any>;
    getMatchDetails(matchId: number, userId: number): Promise<any>;
    resignMatch(matchId: number, userId: number): Promise<{
        message: string;
        match: any;
    }>;
    offerDraw(matchId: number, userId: number): Promise<{
        message: string;
    }>;
    acceptDraw(matchId: number, userId: number): Promise<{
        message: string;
        match: any;
    }>;
}
