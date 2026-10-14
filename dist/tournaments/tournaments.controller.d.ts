import type { Request } from 'express';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { TournamentsService } from './tournaments.service';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
type AuthRequest = Request & {
    user: {
        sub: number;
        email: string;
        role: 'coach' | 'student';
    };
};
export declare class TournamentsController {
    private readonly service;
    constructor(service: TournamentsService);
    findAll(): Promise<{
        success: boolean;
        data: any;
    }>;
    findOne(id: number): Promise<{
        success: boolean;
        data: any;
    }>;
    create(dto: CreateTournamentDto, req: AuthRequest): Promise<{
        success: boolean;
        data: any;
    }>;
    updateStatus(id: number, dto: UpdateTournamentStatusDto): Promise<{
        success: boolean;
        data: any;
    }>;
    joinTournament(id: number, req: AuthRequest): Promise<{
        success: boolean;
        message: string;
        data: {
            tournamentId: number;
            participantId: any;
            userId: number;
            joinedAt: any;
        };
    }>;
    getTournamentStats(id: number): Promise<{
        success: boolean;
        data: {
            tournament: any;
            stats: {
                totalParticipants: any;
                totalMatches: any;
                ongoingMatches: any;
                completedMatches: any;
            };
        };
    }>;
    updateTournament(id: number, dto: UpdateTournamentDto, req: any): Promise<{
        success: boolean;
        data: any;
    }>;
    deleteTournament(id: number, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
