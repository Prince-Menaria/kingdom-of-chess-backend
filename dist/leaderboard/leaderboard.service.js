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
exports.LeaderboardService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const database_module_1 = require("../db/database.module");
const schema_1 = require("../db/schema");
let LeaderboardService = class LeaderboardService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getLeaderboard(tournamentId) {
        if (!Number.isInteger(tournamentId) || tournamentId < 1) {
            throw new common_1.BadRequestException('Invalid tournamentId');
        }
        const [tournament] = await this.db
            .select({
            id: schema_1.tournaments.id,
            name: schema_1.tournaments.name,
        })
            .from(schema_1.tournaments)
            .where((0, drizzle_orm_1.eq)(schema_1.tournaments.id, tournamentId))
            .limit(1);
        if (!tournament) {
            throw new common_1.BadRequestException('Tournament not found');
        }
        const participants = await this.db
            .select({
            userId: schema_1.users.id,
            name: schema_1.users.name,
        })
            .from(schema_1.tournamentParticipants)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.tournamentParticipants.userId, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.tournamentParticipants.tournamentId, tournamentId));
        const completedMatches = await this.db
            .select({
            whitePlayerId: schema_1.matches.whitePlayerId,
            blackPlayerId: schema_1.matches.blackPlayerId,
            result: schema_1.matches.result,
        })
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matches.tournamentId, tournamentId), (0, drizzle_orm_1.eq)(schema_1.matches.status, 'completed')));
        const stats = new Map();
        for (const participant of participants) {
            stats.set(participant.userId, {
                wins: 0,
                losses: 0,
                draws: 0,
                points: 0,
            });
        }
        for (const match of completedMatches) {
            const white = stats.get(match.whitePlayerId);
            const black = stats.get(match.blackPlayerId);
            if (!white || !black) {
                continue;
            }
            if (match.result === 'white_win') {
                white.wins += 1;
                white.points += 1;
                black.losses += 1;
            }
            else if (match.result === 'black_win') {
                black.wins += 1;
                black.points += 1;
                white.losses += 1;
            }
            else if (match.result === 'draw') {
                white.draws += 1;
                black.draws += 1;
                white.points += 0.5;
                black.points += 0.5;
            }
        }
        const leaderboard = participants.map((participant) => ({
            userId: participant.userId,
            name: participant.name,
            ...stats.get(participant.userId),
        }));
        leaderboard.sort((a, b) => b.points - a.points ||
            b.wins - a.wins ||
            a.name.localeCompare(b.name));
        return {
            tournament,
            leaderboard: leaderboard.map((player, index) => ({
                rank: index + 1,
                ...player,
            })),
        };
    }
};
exports.LeaderboardService = LeaderboardService;
exports.LeaderboardService = LeaderboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DATABASE)),
    __metadata("design:paramtypes", [Object])
], LeaderboardService);
//# sourceMappingURL=leaderboard.service.js.map