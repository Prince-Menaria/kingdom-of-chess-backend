import { Request } from 'express';
import { MatchmakingService } from './matchmaking.service';
interface AuthRequest extends Request {
    user: {
        sub: number;
        email: string;
        role: 'coach' | 'student';
    };
}
export declare class MatchmakingController {
    private readonly service;
    constructor(service: MatchmakingService);
    findOpponent(id: number, req: AuthRequest): Promise<any>;
}
export {};
