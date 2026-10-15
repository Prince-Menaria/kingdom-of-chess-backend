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
exports.MatchesGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const jwt_1 = require("@nestjs/jwt");
const socket_io_1 = require("socket.io");
const matches_service_1 = require("./matches.service");
let MatchesGateway = class MatchesGateway {
    matchesService;
    jwtService;
    server;
    constructor(matchesService, jwtService) {
        this.matchesService = matchesService;
        this.jwtService = jwtService;
    }
    async handleConnection(client) {
        try {
            const cookieHeader = client.handshake.headers.cookie ?? '';
            const tokenCookie = cookieHeader
                .split(';')
                .map((cookie) => cookie.trim())
                .find((cookie) => cookie.startsWith('access_token='));
            const token = tokenCookie
                ? decodeURIComponent(tokenCookie.substring('access_token='.length))
                : undefined;
            if (!token) {
                client.disconnect(true);
                return;
            }
            const payload = await this.jwtService.verifyAsync(token);
            if (!Number.isInteger(payload.sub) ||
                !['coach', 'student'].includes(payload.role)) {
                client.disconnect(true);
                return;
            }
            client.data.user = {
                sub: Number(payload.sub),
                email: payload.email,
                role: payload.role,
            };
        }
        catch {
            client.disconnect(true);
        }
    }
    handleDisconnect(_client) {
    }
    async handleJoinMatch(body, client) {
        try {
            const user = client.data.user;
            if (!user) {
                throw new websockets_1.WsException('Authentication required');
            }
            if (!Number.isInteger(body?.matchId) || body.matchId < 1) {
                throw new websockets_1.WsException('A valid matchId is required');
            }
            const match = await this.matchesService.getPlayerMatch(body.matchId, user.sub);
            const room = `match:${match.id}`;
            await client.join(room);
            client.emit('match_state', {
                matchId: match.id,
                status: match.status,
                fen: match.fen,
                pgn: match.pgn,
                whitePlayerId: match.whitePlayerId,
                blackPlayerId: match.blackPlayerId,
                result: match.result,
            });
            return { success: true, matchId: match.id };
        }
        catch (error) {
            throw new websockets_1.WsException(error instanceof Error ? error.message : 'Could not join match');
        }
    }
    async handleMakeMove(body, client) {
        try {
            const user = client.data.user;
            if (!user) {
                throw new websockets_1.WsException('Authentication required');
            }
            if (!Number.isInteger(body?.matchId) ||
                !/^[a-h][1-8]$/.test(body?.from ?? '') ||
                !/^[a-h][1-8]$/.test(body?.to ?? '') ||
                (body?.promotion !== undefined &&
                    !['q', 'r', 'b', 'n'].includes(body.promotion))) {
                throw new websockets_1.WsException('Invalid move payload');
            }
            const room = `match:${body.matchId}`;
            if (!client.rooms.has(room)) {
                throw new websockets_1.WsException('Join this match before making a move');
            }
            const result = await this.matchesService.makeMove(body.matchId, user.sub, body.from, body.to, body.promotion);
            if (result.gameOver) {
                this.server.to(room).emit('game_over', {
                    matchId: body.matchId,
                    result: result.result,
                    fen: result.fen,
                    pgn: result.pgn,
                });
            }
            else {
                this.server.to(room).emit('move_made', {
                    matchId: body.matchId,
                    move: result.move,
                    fen: result.fen,
                    pgn: result.pgn,
                });
            }
            return { success: true };
        }
        catch (error) {
            throw new websockets_1.WsException(error instanceof Error ? error.message : 'Move failed');
        }
    }
};
exports.MatchesGateway = MatchesGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MatchesGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_match'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MatchesGateway.prototype, "handleJoinMatch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('make_move'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MatchesGateway.prototype, "handleMakeMove", null);
exports.MatchesGateway = MatchesGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: 'https://kingdom-chess-project.netlify.app/',
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [matches_service_1.MatchesService,
        jwt_1.JwtService])
], MatchesGateway);
//# sourceMappingURL=matches.gateway.js.map