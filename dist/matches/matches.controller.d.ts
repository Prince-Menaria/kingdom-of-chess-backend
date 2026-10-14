import { MatchesService } from './matches.service';
export declare class MatchesController {
    private readonly matchesService;
    constructor(matchesService: MatchesService);
    getMatchHistory(req: any): Promise<{
        success: boolean;
        data: any;
    }>;
    getMatchDetails(matchId: number, req: any): Promise<{
        success: boolean;
        data: any;
    }>;
    resignMatch(id: number, req: any): Promise<{
        success: boolean;
        data: {
            message: string;
            match: any;
        };
    }>;
    offerDraw(id: number, req: any): Promise<{
        success: boolean;
        data: {
            message: string;
        };
    }>;
    acceptDraw(id: number, req: any): Promise<{
        success: boolean;
        data: {
            message: string;
            match: any;
        };
    }>;
}
