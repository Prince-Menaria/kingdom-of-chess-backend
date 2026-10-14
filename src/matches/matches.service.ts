import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { desc, and, eq, or } from 'drizzle-orm';
import { Chess } from 'chess.js';
import { DATABASE } from '../db/database.module';
import { matches } from '../db/schema';

@Injectable()
export class MatchesService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async getMatch(matchId: number) {
    const [match] = await this.db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  async getPlayerMatch(matchId: number, userId: number) {
    const match = await this.getMatch(matchId);

    if (match.whitePlayerId !== userId && match.blackPlayerId !== userId) {
      throw new ForbiddenException('You are not a participant in this match');
    }

    return match;
  }

  async makeMove(
    matchId: number,
    userId: number,
    from: string,
    to: string,
    promotion?: string,
  ) {
    const match = await this.getPlayerMatch(matchId, userId);

    if (match.status !== 'ongoing') {
      throw new BadRequestException('This match has already ended');
    }

    const chess = new Chess(match.fen);

    // Check whether it is this player's turn.
    const isWhiteTurn = chess.turn() === 'w';
    const isCorrectPlayer = isWhiteTurn
      ? match.whitePlayerId === userId
      : match.blackPlayerId === userId;

    if (!isCorrectPlayer) {
      throw new ForbiddenException("It's not your turn");
    }

    let playedMove;

    try {
      playedMove = chess.move({
        from,
        to,
        ...(promotion ? { promotion } : {}),
      });
    } catch {
      throw new BadRequestException('Illegal chess move');
    }

    if (!playedMove) {
      throw new BadRequestException('Illegal chess move');
    }

    const gameOver = chess.isGameOver();
    let result: 'white_win' | 'black_win' | 'draw' | null = null;

    if (chess.isCheckmate()) {
      // chess.turn() is the side that has been checkmated.
      result = chess.turn() === 'w' ? 'black_win' : 'white_win';
    } else if (gameOver) {
      result = 'draw';
    }

    const [updatedMatch] = await this.db
      .update(matches)
      .set({
        fen: chess.fen(),
        pgn: chess.pgn(),
        ...(gameOver
          ? {
              status: 'completed' as const,
              result,
              endedAt: new Date(),
            }
          : {}),
      })
      .where(and(eq(matches.id, matchId), eq(matches.status, 'ongoing')))
      .returning();

    if (!updatedMatch) {
      throw new BadRequestException('Match has ended or could not be updated');
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

  async getMatchHistory(userId: number) {
    const history = await this.db
      .select({
        matchId: matches.id,
        tournamentId: matches.tournamentId,
        whitePlayerId: matches.whitePlayerId,
        blackPlayerId: matches.blackPlayerId,
        status: matches.status,
        result: matches.result,
        pgn: matches.pgn,
        createdAt: matches.createdAt,
        endedAt: matches.endedAt,
      })
      .from(matches)
      .where(
        or(
          eq(matches.whitePlayerId, userId),
          eq(matches.blackPlayerId, userId),
        ),
      )
      .orderBy(desc(matches.createdAt));

    return history.map(
      (match: {
        matchId: number;
        tournamentId: number;
        whitePlayerId: number;
        blackPlayerId: number;
        status: string;
        result: string | null;
        pgn: string | null;
        createdAt: Date;
        endedAt: Date | null;
      }) => ({
        ...match,
        opponentId:
          match.whitePlayerId === userId
            ? match.blackPlayerId
            : match.whitePlayerId,
        playerColor: match.whitePlayerId === userId ? 'white' : 'black',
        playerResult:
          match.status !== 'completed'
            ? 'in_progress'
            : match.result === 'draw'
              ? 'draw'
              : (match.result === 'white_win' &&
                    match.whitePlayerId === userId) ||
                  (match.result === 'black_win' &&
                    match.blackPlayerId === userId)
                ? 'win'
                : 'loss',
      }),
    );
  }

  async getMatchDetails(matchId: number, userId: number) {
    const [match] = await this.db
      .select({
        id: matches.id,
        tournamentId: matches.tournamentId,
        whitePlayerId: matches.whitePlayerId,
        blackPlayerId: matches.blackPlayerId,
        status: matches.status,
        result: matches.result,
        fen: matches.fen,
        pgn: matches.pgn,
        createdAt: matches.createdAt,
        endedAt: matches.endedAt,
      })
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.whitePlayerId !== userId && match.blackPlayerId !== userId) {
      throw new ForbiddenException('You are not a participant in this match');
    }

    return match;
  }

  async resignMatch(matchId: number, userId: number) {
    const [match] = await this.db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== 'ongoing') {
      throw new BadRequestException('Match is already completed');
    }

    const isWhite = match.whitePlayerId === userId;
    const isBlack = match.blackPlayerId === userId;

    if (!isWhite && !isBlack) {
      throw new ForbiddenException('You are not a participant of this match');
    }

    const result = isWhite ? 'black_win' : 'white_win';

    const [updatedMatch] = await this.db
      .update(matches)
      .set({
        status: 'completed',
        result,
        endedAt: new Date(),
      })
      .where(eq(matches.id, matchId))
      .returning();

    return {
      message: 'Match resigned successfully',
      match: updatedMatch,
    };
  }

  async offerDraw(matchId: number, userId: number) {
    const [match] = await this.db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== 'ongoing') {
      throw new BadRequestException('Match is not ongoing');
    }

    if (match.whitePlayerId !== userId && match.blackPlayerId !== userId) {
      throw new ForbiddenException('Not a match participant');
    }

    if (match.drawOfferedBy) {
      throw new BadRequestException('A draw offer already exists');
    }

    await this.db
      .update(matches)
      .set({ drawOfferedBy: userId })
      .where(eq(matches.id, matchId));

    return { message: 'Draw offer sent successfully' };
  }

  async acceptDraw(matchId: number, userId: number) {
    const [match] = await this.db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== 'ongoing') {
      throw new BadRequestException('Match is not ongoing');
    }

    if (match.whitePlayerId !== userId && match.blackPlayerId !== userId) {
      throw new ForbiddenException('Not a match participant');
    }

    if (!match.drawOfferedBy) {
      throw new BadRequestException('No draw offer to accept');
    }

    if (match.drawOfferedBy === userId) {
      throw new BadRequestException('You cannot accept your own offer');
    }

    const [updatedMatch] = await this.db
      .update(matches)
      .set({
        status: 'completed',
        result: 'draw',
        drawOfferedBy: null,
        endedAt: new Date(),
      })
      .where(eq(matches.id, matchId))
      .returning();

    return {
      message: 'Draw accepted',
      match: updatedMatch,
    };
  }
}
