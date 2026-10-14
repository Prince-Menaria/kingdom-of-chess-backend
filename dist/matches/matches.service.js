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
exports.MatchesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const chess_js_1 = require("chess.js");
const database_module_1 = require("../db/database.module");
const schema_1 = require("../db/schema");
let MatchesService = class MatchesService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getMatch(matchId) {
        const [match] = await this.db
            .select()
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, matchId))
            .limit(1);
        if (!match) {
            throw new common_1.NotFoundException('Match not found');
        }
        return match;
    }
    async getPlayerMatch(matchId, userId) {
        const match = await this.getMatch(matchId);
        if (match.whitePlayerId !== userId && match.blackPlayerId !== userId) {
            throw new common_1.ForbiddenException('You are not a participant in this match');
        }
        return match;
    }
    async makeMove(matchId, userId, from, to, promotion) {
        const match = await this.getPlayerMatch(matchId, userId);
        if (match.status !== 'ongoing') {
            throw new common_1.BadRequestException('This match has already ended');
        }
        const chess = new chess_js_1.Chess(match.fen);
        const isWhiteTurn = chess.turn() === 'w';
        const isCorrectPlayer = isWhiteTurn
            ? match.whitePlayerId === userId
            : match.blackPlayerId === userId;
        if (!isCorrectPlayer) {
            throw new common_1.ForbiddenException("It's not your turn");
        }
        let playedMove;
        try {
            playedMove = chess.move({
                from,
                to,
                ...(promotion ? { promotion } : {}),
            });
        }
        catch {
            throw new common_1.BadRequestException('Illegal chess move');
        }
        if (!playedMove) {
            throw new common_1.BadRequestException('Illegal chess move');
        }
        const gameOver = chess.isGameOver();
        let result = null;
        if (chess.isCheckmate()) {
            result = chess.turn() === 'w' ? 'black_win' : 'white_win';
        }
        else if (gameOver) {
            result = 'draw';
        }
        const [updatedMatch] = await this.db
            .update(schema_1.matches)
            .set({
            fen: chess.fen(),
            pgn: chess.pgn(),
            ...(gameOver
                ? {
                    status: 'completed',
                    result,
                    endedAt: new Date(),
                }
                : {}),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.matches.id, matchId), (0, drizzle_orm_1.eq)(schema_1.matches.status, 'ongoing')))
            .returning();
        if (!updatedMatch) {
            throw new common_1.BadRequestException('Match has ended or could not be updated');
        }
        return {
            match: updatedMatch,
            move: {
                from: playedMove.from,
                to: playedMove.to,
                san: playedMove.san,
                color: playedMove.color,
            },
            gameOver,
            result,
            fen: chess.fen(),
            pgn: chess.pgn(),
        };
    }
    async getMatchHistory(userId) {
        const history = await this.db
            .select({
            matchId: schema_1.matches.id,
            tournamentId: schema_1.matches.tournamentId,
            whitePlayerId: schema_1.matches.whitePlayerId,
            blackPlayerId: schema_1.matches.blackPlayerId,
            status: schema_1.matches.status,
            result: schema_1.matches.result,
            pgn: schema_1.matches.pgn,
            createdAt: schema_1.matches.createdAt,
            endedAt: schema_1.matches.endedAt,
        })
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.matches.whitePlayerId, userId), (0, drizzle_orm_1.eq)(schema_1.matches.blackPlayerId, userId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.matches.createdAt));
        return history.map((match) => ({
            ...match,
            opponentId: match.whitePlayerId === userId
                ? match.blackPlayerId
                : match.whitePlayerId,
            playerColor: match.whitePlayerId === userId ? 'white' : 'black',
            playerResult: match.status !== 'completed'
                ? 'in_progress'
                : match.result === 'draw'
                    ? 'draw'
                    : (match.result === 'white_win' &&
                        match.whitePlayerId === userId) ||
                        (match.result === 'black_win' &&
                            match.blackPlayerId === userId)
                        ? 'win'
                        : 'loss',
        }));
    }
    async getMatchDetails(matchId, userId) {
        const [match] = await this.db
            .select({
            id: schema_1.matches.id,
            tournamentId: schema_1.matches.tournamentId,
            whitePlayerId: schema_1.matches.whitePlayerId,
            blackPlayerId: schema_1.matches.blackPlayerId,
            status: schema_1.matches.status,
            result: schema_1.matches.result,
            fen: schema_1.matches.fen,
            pgn: schema_1.matches.pgn,
            createdAt: schema_1.matches.createdAt,
            endedAt: schema_1.matches.endedAt,
        })
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, matchId))
            .limit(1);
        if (!match) {
            throw new common_1.NotFoundException('Match not found');
        }
        if (match.whitePlayerId !== userId && match.blackPlayerId !== userId) {
            throw new common_1.ForbiddenException('You are not a participant in this match');
        }
        return match;
    }
    async resignMatch(matchId, userId) {
        const [match] = await this.db
            .select()
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, matchId))
            .limit(1);
        if (!match) {
            throw new common_1.NotFoundException('Match not found');
        }
        if (match.status !== 'ongoing') {
            throw new common_1.BadRequestException('Match is already completed');
        }
        const isWhite = match.whitePlayerId === userId;
        const isBlack = match.blackPlayerId === userId;
        if (!isWhite && !isBlack) {
            throw new common_1.ForbiddenException('You are not a participant of this match');
        }
        const result = isWhite ? 'black_win' : 'white_win';
        const [updatedMatch] = await this.db
            .update(schema_1.matches)
            .set({
            status: 'completed',
            result,
            endedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, matchId))
            .returning();
        return {
            message: 'Match resigned successfully',
            match: updatedMatch,
        };
    }
    async offerDraw(matchId, userId) {
        const [match] = await this.db
            .select()
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, matchId))
            .limit(1);
        if (!match) {
            throw new common_1.NotFoundException('Match not found');
        }
        if (match.status !== 'ongoing') {
            throw new common_1.BadRequestException('Match is not ongoing');
        }
        if (match.whitePlayerId !== userId && match.blackPlayerId !== userId) {
            throw new common_1.ForbiddenException('Not a match participant');
        }
        if (match.drawOfferedBy) {
            throw new common_1.BadRequestException('A draw offer already exists');
        }
        await this.db
            .update(schema_1.matches)
            .set({ drawOfferedBy: userId })
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, matchId));
        return { message: 'Draw offer sent successfully' };
    }
    async acceptDraw(matchId, userId) {
        const [match] = await this.db
            .select()
            .from(schema_1.matches)
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, matchId))
            .limit(1);
        if (!match) {
            throw new common_1.NotFoundException('Match not found');
        }
        if (match.status !== 'ongoing') {
            throw new common_1.BadRequestException('Match is not ongoing');
        }
        if (match.whitePlayerId !== userId && match.blackPlayerId !== userId) {
            throw new common_1.ForbiddenException('Not a match participant');
        }
        if (!match.drawOfferedBy) {
            throw new common_1.BadRequestException('No draw offer to accept');
        }
        if (match.drawOfferedBy === userId) {
            throw new common_1.BadRequestException('You cannot accept your own offer');
        }
        const [updatedMatch] = await this.db
            .update(schema_1.matches)
            .set({
            status: 'completed',
            result: 'draw',
            drawOfferedBy: null,
            endedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.matches.id, matchId))
            .returning();
        return {
            message: 'Draw accepted',
            match: updatedMatch,
        };
    }
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DATABASE)),
    __metadata("design:paramtypes", [Object])
], MatchesService);
//# sourceMappingURL=matches.service.js.map