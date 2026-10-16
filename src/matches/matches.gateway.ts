import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
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

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class MatchesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly matchesService: MatchesService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
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

      if (
        !Number.isInteger(payload.sub) ||
        !['coach', 'student'].includes(payload.role)
      ) {
        client.disconnect(true);
        return;
      }

      client.data.user = {
        sub: Number(payload.sub),
        email: payload.email,
        role: payload.role,
      };
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // A disconnected player can reconnect and rejoin the match.
  }

  @SubscribeMessage('join_match')
  async handleJoinMatch(
    @MessageBody() body: { matchId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const user = client.data.user;

      if (!user) {
        throw new WsException('Authentication required');
      }

      if (!Number.isInteger(body?.matchId) || body.matchId < 1) {
        throw new WsException('A valid matchId is required');
      }

      const match = await this.matchesService.getPlayerMatch(
        body.matchId,
        user.sub,
      );

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
    } catch (error) {
      throw new WsException(
        error instanceof Error ? error.message : 'Could not join match',
      );
    }
  }

  @SubscribeMessage('make_move')
  async handleMakeMove(
    @MessageBody()
    body: {
      matchId: number;
      from: string;
      to: string;
      promotion?: string;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const user = client.data.user;

      if (!user) {
        throw new WsException('Authentication required');
      }

      if (
        !Number.isInteger(body?.matchId) ||
        !/^[a-h][1-8]$/.test(body?.from ?? '') ||
        !/^[a-h][1-8]$/.test(body?.to ?? '') ||
        (body?.promotion !== undefined &&
          !['q', 'r', 'b', 'n'].includes(body.promotion))
      ) {
        throw new WsException('Invalid move payload');
      }

      // Verify room membership as well as player identity.
      const room = `match:${body.matchId}`;

      if (!client.rooms.has(room)) {
        throw new WsException('Join this match before making a move');
      }

      const result = await this.matchesService.makeMove(
        body.matchId,
        user.sub,
        body.from,
        body.to,
        body.promotion,
      );

      if (result.gameOver) {
        this.server.to(room).emit('game_over', {
          matchId: body.matchId,
          result: result.result,
          fen: result.fen,
          pgn: result.pgn,
        });
      } else {
        this.server.to(room).emit('move_made', {
          matchId: body.matchId,
          move: result.move,
          fen: result.fen,
          pgn: result.pgn,
        });
      }

      return { success: true };
    } catch (error) {
      throw new WsException(
        error instanceof Error ? error.message : 'Move failed',
      );
    }
  }
}
