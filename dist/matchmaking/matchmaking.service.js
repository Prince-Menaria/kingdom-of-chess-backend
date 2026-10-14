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
exports.MatchmakingService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const chess_js_1 = require("chess.js");
const database_module_1 = require("../db/database.module");
const schema_1 = require("../db/schema");
let MatchmakingService = class MatchmakingService {
    db;
    constructor(db) {
        this.db = db;
    }
    async findOpponent(tournamentId, studentId) {
        const [tournament] = await this.db
            .select()
            .from(schema_1.tournaments)
            .where((0, drizzle_orm_1.eq)(schema_1.tournaments.id, tournamentId))
            .limit(1);
        if (!tournament) {
            throw new common_1.NotFoundException('Tournament not found');
        }
        if (!['open', 'ongoing'].includes(tournament.status)) {
            throw new common_1.BadRequestException('Tournament is not accepting matchmaking requests');
        }
        const [participant] = await this.db
            .select()
            .from(schema_1.tournamentParticipants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tournamentParticipants.tournamentId, tournamentId), (0, drizzle_orm_1.eq)(schema_1.tournamentParticipants.userId, studentId)))
            .limit(1);
        if (!participant) {
            throw new common_1.ForbiddenException('Join the tournament before finding an opponent');
        }
        const [existingMatch] = await this.db
            .select()
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matches.tournamentId, tournamentId), (0, drizzle_orm_1.eq)(schema_1.matches.status, 'ongoing'), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.matches.whitePlayerId, studentId), (0, drizzle_orm_1.eq)(schema_1.matches.blackPlayerId, studentId))))
            .limit(1);
        if (existingMatch) {
            await this.db
                .delete(schema_1.matchmakingQueue)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matchmakingQueue.tournamentId, tournamentId), (0, drizzle_orm_1.eq)(schema_1.matchmakingQueue.studentId, studentId)));
            return {
                status: 'matched',
                match: existingMatch,
                message: 'You already have an active match.',
            };
        }
        return this.db.transaction(async (tx) => {
            const candidates = await tx
                .select()
                .from(schema_1.matchmakingQueue)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matchmakingQueue.tournamentId, tournamentId), (0, drizzle_orm_1.ne)(schema_1.matchmakingQueue.studentId, studentId)))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.matchmakingQueue.createdAt))
                .limit(1)
                .for('update', { skipLocked: true });
            if (candidates.length > 0) {
                const opponent = candidates[0];
                await tx
                    .delete(schema_1.matchmakingQueue)
                    .where((0, drizzle_orm_1.eq)(schema_1.matchmakingQueue.id, opponent.id));
                await tx
                    .delete(schema_1.matchmakingQueue)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matchmakingQueue.tournamentId, tournamentId), (0, drizzle_orm_1.eq)(schema_1.matchmakingQueue.studentId, studentId)));
                const chess = new chess_js_1.Chess();
                const [match] = await tx
                    .insert(schema_1.matches)
                    .values({
                    tournamentId,
                    whitePlayerId: opponent.studentId,
                    blackPlayerId: studentId,
                    status: 'ongoing',
                    fen: chess.fen(),
                    pgn: '',
                })
                    .returning();
                return {
                    status: 'matched',
                    match,
                    message: 'Opponent found! Your match is ready.',
                };
            }
            const [existingQueueEntry] = await tx
                .select()
                .from(schema_1.matchmakingQueue)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matchmakingQueue.tournamentId, tournamentId), (0, drizzle_orm_1.eq)(schema_1.matchmakingQueue.studentId, studentId)))
                .limit(1);
            if (!existingQueueEntry) {
                await tx.insert(schema_1.matchmakingQueue).values({
                    tournamentId,
                    studentId,
                });
            }
            return {
                status: 'waiting',
                message: 'Waiting for an opponent. Please try again shortly.',
            };
        });
    }
};
exports.MatchmakingService = MatchmakingService;
exports.MatchmakingService = MatchmakingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DATABASE)),
    __metadata("design:paramtypes", [Object])
], MatchmakingService);
//# sourceMappingURL=matchmaking.service.js.map