
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, asc, eq, ne, or } from 'drizzle-orm';
import { Chess } from 'chess.js';

import { DATABASE } from '../db/database.module';

import {
  matchmakingQueue,
  matches,
  tournamentParticipants,
  tournaments,
} from '../db/schema';

@Injectable()
export class MatchmakingService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async findOpponent(tournamentId: number, studentId: number) {
    // 1. Check tournament exists
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // 2. Check tournament status
    if (!['open', 'ongoing'].includes(tournament.status)) {
      throw new BadRequestException(
        'Tournament is not accepting matchmaking requests',
      );
    }

    // 3. Check student joined the tournament
    const [participant] = await this.db
      .select()
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, studentId),
        ),
      )
      .limit(1);

    if (!participant) {
      throw new ForbiddenException(
        'Join the tournament before finding an opponent',
      );
    }

    // 4. Return an existing active match for this student, if any
    const [existingMatch] = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.status, 'ongoing'),
          or(
            eq(matches.whitePlayerId, studentId),
            eq(matches.blackPlayerId, studentId),
          ),
        ),
      )
      .limit(1);

    if (existingMatch) {
      // Ensure a matched student is not left in the queue
      await this.db
        .delete(matchmakingQueue)
        .where(
          and(
            eq(matchmakingQueue.tournamentId, tournamentId),
            eq(matchmakingQueue.studentId, studentId),
          ),
        );

      return {
        status: 'matched',
        match: existingMatch,
        message: 'You already have an active match.',
      };
    }

    // 5. Find an opponent or add the student to the queue
    return this.db.transaction(async (tx: any) => {
      const candidates = await tx
        .select()
        .from(matchmakingQueue)
        .where(
          and(
            eq(matchmakingQueue.tournamentId, tournamentId),
            ne(matchmakingQueue.studentId, studentId),
          ),
        )
        .orderBy(asc(matchmakingQueue.createdAt))
        .limit(1)
        .for('update', { skipLocked: true });

      if (candidates.length > 0) {
        const opponent = candidates[0];

        // Remove the opponent from the queue
        await tx
          .delete(matchmakingQueue)
          .where(eq(matchmakingQueue.id, opponent.id));

        // Remove current student from queue if already waiting
        await tx
          .delete(matchmakingQueue)
          .where(
            and(
              eq(matchmakingQueue.tournamentId, tournamentId),
              eq(matchmakingQueue.studentId, studentId),
            ),
          );

        // Create a fresh chess game
        const chess = new Chess();

        const [match] = await tx
          .insert(matches)
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

      // No opponent available: check whether student is already waiting
      const [existingQueueEntry] = await tx
        .select()
        .from(matchmakingQueue)
        .where(
          and(
            eq(matchmakingQueue.tournamentId, tournamentId),
            eq(matchmakingQueue.studentId, studentId),
          ),
        )
        .limit(1);

      if (!existingQueueEntry) {
        await tx.insert(matchmakingQueue).values({
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
}
