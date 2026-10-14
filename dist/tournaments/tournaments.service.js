"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const database_module_1 = require("../db/database.module");
const schema_1 = require("../db/schema");
let TournamentsService = class TournamentsService {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(dto, coachId) {
        const [tournament] = await this.db
            .insert(schema_1.tournaments)
            .values({
            name: dto.name.trim(),
            timeControl: dto.timeControl,
            startAt: new Date(dto.startAt),
            createdBy: coachId,
            status: 'draft',
        })
            .returning();
        return tournament;
    }
    async findAll() {
        return this.db
            .select()
            .from(schema_1.tournaments)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.tournaments.createdAt));
    }
    async findOne(id) {
        const [tournament] = await this.db
            .select()
            .from(schema_1.tournaments)
            .where((0, drizzle_orm_1.eq)(schema_1.tournaments.id, id))
            .limit(1);
        if (!tournament) {
            throw new common_1.NotFoundException('Tournament not found');
        }
        return tournament;
    }
    async updateStatus(id, status) {
        const existing = await this.findOne(id);
        if (existing.status === 'completed') {
            throw new common_1.BadRequestException('Completed tournaments cannot be reopened');
        }
        const [updated] = await this.db
            .update(schema_1.tournaments)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(schema_1.tournaments.id, id))
            .returning();
        return updated;
    }
    async joinTournament(tournamentId, studentId) {
        const tournament = await this.findOne(tournamentId);
        if (tournament.status !== 'open') {
            throw new common_1.BadRequestException('Only open tournaments can be joined');
        }
        const [existingParticipant] = await this.db
            .select()
            .from(schema_1.tournamentParticipants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tournamentParticipants.tournamentId, tournamentId), (0, drizzle_orm_1.eq)(schema_1.tournamentParticipants.userId, studentId)))
            .limit(1);
        if (existingParticipant) {
            throw new common_1.ConflictException('You have already joined this tournament');
        }
        try {
            const [participant] = await this.db
                .insert(schema_1.tournamentParticipants)
                .values({
                tournamentId,
                userId: studentId,
            })
                .returning();
            return {
                tournamentId,
                participantId: participant.id,
                userId: studentId,
                joinedAt: participant.joinedAt,
            };
        }
        catch (error) {
            if (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === '23505') {
                throw new common_1.ConflictException('You have already joined this tournament');
            }
            throw error;
        }
    }
    async getTournamentStats(tournamentId) {
        if (!Number.isInteger(tournamentId) || tournamentId < 1) {
            throw new common_1.BadRequestException('Invalid tournamentId');
        }
        const [tournament] = await this.db
            .select({
            id: schema_1.tournaments.id,
            name: schema_1.tournaments.name,
            status: schema_1.tournaments.status,
        })
            .from(schema_1.tournaments)
            .where((0, drizzle_orm_1.eq)(schema_1.tournaments.id, tournamentId))
            .limit(1);
        if (!tournament) {
            throw new common_1.NotFoundException('Tournament not found');
        }
        const participants = await this.db
            .select({
            userId: schema_1.tournamentParticipants.userId,
        })
            .from(schema_1.tournamentParticipants)
            .where((0, drizzle_orm_1.eq)(schema_1.tournamentParticipants.tournamentId, tournamentId));
        const tournamentMatches = await this.db
            .select({
            id: schema_1.matches.id,
            status: schema_1.matches.status,
            result: schema_1.matches.result,
        })
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.eq)(schema_1.matches.tournamentId, tournamentId));
        return {
            tournament,
            stats: {
                totalParticipants: participants.length,
                totalMatches: tournamentMatches.length,
                ongoingMatches: tournamentMatches.filter((match) => match.status === 'ongoing').length,
                completedMatches: tournamentMatches.filter((match) => match.status === 'completed').length,
            },
        };
    }
    async update(tournamentId, coachId, dto) {
        const [tournament] = await this.db
            .select()
            .from(schema_1.tournaments)
            .where((0, drizzle_orm_1.eq)(schema_1.tournaments.id, tournamentId))
            .limit(1);
        if (!tournament) {
            throw new common_1.NotFoundException('Tournament not found');
        }
        if (tournament.createdBy !== coachId) {
            throw new common_1.ForbiddenException('You can only update your own tournaments');
        }
        if (tournament.status === 'completed') {
            throw new common_1.BadRequestException('Completed tournaments cannot be updated');
        }
        const [updated] = await this.db
            .update(schema_1.tournaments)
            .set({
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.timeControl !== undefined && {
                timeControl: dto.timeControl,
            }),
            ...(dto.startAt !== undefined && {
                startAt: new Date(dto.startAt),
            }),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.tournaments.id, tournamentId))
            .returning();
        return updated;
    }
    async remove(tournamentId, coachId) {
        const [tournament] = await this.db
            .select()
            .from(schema_1.tournaments)
            .where((0, drizzle_orm_1.eq)(schema_1.tournaments.id, tournamentId))
            .limit(1);
        if (!tournament) {
            throw new common_1.NotFoundException('Tournament not found');
        }
        if (tournament.createdBy !== coachId) {
            throw new common_1.ForbiddenException('You can only delete your own tournaments');
        }
        if (tournament.status === 'ongoing') {
            throw new common_1.BadRequestException('Ongoing tournaments cannot be deleted');
        }
        await this.db.delete(schema_1.tournaments).where((0, drizzle_orm_1.eq)(schema_1.tournaments.id, tournamentId));
        return { id: tournamentId };
    }
};
exports.TournamentsService = TournamentsService;
exports.TournamentsService = TournamentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DATABASE)),
    __metadata("design:paramtypes", [Object])
], TournamentsService);
//# sourceMappingURL=tournaments.service.js.map