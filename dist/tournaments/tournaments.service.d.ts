import { CreateTournamentDto } from './dto/create-tournament.dto';
export declare class TournamentsService {
    private readonly db;
    constructor(db: any);
    create(dto: CreateTournamentDto, coachId: number): Promise<any>;
    findAll(): Promise<any>;
    findOne(id: number): Promise<any>;
    updateStatus(id: number, status: 'draft' | 'open' | 'ongoing' | 'completed'): Promise<any>;
    joinTournament(tournamentId: number, studentId: number): Promise<{
        tournamentId: number;
        participantId: any;
        userId: number;
        joinedAt: any;
    }>;
}
