import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { MatchesService } from './matches.service';
type AuthenticatedSocket = Socket & {
    data: {
        user?: {
            sub: number;
            email: string;
            role: 'coach' | 'student';
        };
    };
};
export declare class MatchesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly matchesService;
    private readonly jwtService;
    server: Server;
    constructor(matchesService: MatchesService, jwtService: JwtService);
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(_client: Socket): void;
    handleJoinMatch(body: {
        matchId: number;
    }, client: AuthenticatedSocket): Promise<{
        success: boolean;
        matchId: any;
    }>;
    handleMakeMove(body: {
        matchId: number;
        from: string;
        to: string;
        promotion?: string;
    }, client: AuthenticatedSocket): Promise<{
        success: boolean;
    }>;
}
export {};
