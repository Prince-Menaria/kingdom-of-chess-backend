
import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE } from '../db/database.module';
import {
  matches,
  tournamentParticipants,
  tournaments,
  users,
} from '../db/schema';

type LeaderboardPlayer = {
  userId: number;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
};

type TournamentParticipant = {
  userId: number;
  name: string;
};

type CompletedMatch = {
  whitePlayerId: number;
  blackPlayerId: number;
  result: 'white_win' | 'black_win' | 'draw' | null;
};

type PlayerStats = {
  wins: number;
  losses: number;
  draws: number;
  points: number;
};

@Injectable()
export class LeaderboardService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async getLeaderboard(tournamentId: number) {
    if (!Number.isInteger(tournamentId) || tournamentId < 1) {
      throw new BadRequestException('Invalid tournamentId');
    }

    const [tournament] = await this.db
      .select({
        id: tournaments.id,
        name: tournaments.name,
      })
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);

    if (!tournament) {
      throw new BadRequestException('Tournament not found');
    }

    const participants: TournamentParticipant[] = await this.db
      .select({
        userId: users.id,
        name: users.name,
      })
      .from(tournamentParticipants)
      .innerJoin(
        users,
        eq(tournamentParticipants.userId, users.id),
      )
      .where(
        eq(tournamentParticipants.tournamentId, tournamentId),
      );

    const completedMatches: CompletedMatch[] = await this.db
      .select({
        whitePlayerId: matches.whitePlayerId,
        blackPlayerId: matches.blackPlayerId,
        result: matches.result,
      })
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.status, 'completed'),
        ),
      );

    const stats = new Map<number, PlayerStats>();

    // Initialize statistics for all tournament participants.
    for (const participant of participants) {
      stats.set(participant.userId, {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
      });
    }

    // Calculate points from completed matches.
    for (const match of completedMatches) {
      const white = stats.get(match.whitePlayerId);
      const black = stats.get(match.blackPlayerId);

      // Ignore matches if either player is not a participant.
      if (!white || !black) {
        continue;
      }

      if (match.result === 'white_win') {
        white.wins += 1;
        white.points += 1;
        black.losses += 1;
      } else if (match.result === 'black_win') {
        black.wins += 1;
        black.points += 1;
        white.losses += 1;
      } else if (match.result === 'draw') {
        white.draws += 1;
        black.draws += 1;
        white.points += 0.5;
        black.points += 0.5;
      }
    }

    const leaderboard: LeaderboardPlayer[] = participants.map(
      (participant: TournamentParticipant): LeaderboardPlayer => ({
        userId: participant.userId,
        name: participant.name,
        ...stats.get(participant.userId)!,
      }),
    );

    // Sort by points, then wins, then player name.
    leaderboard.sort(
      (a: LeaderboardPlayer, b: LeaderboardPlayer) =>
        b.points - a.points ||
        b.wins - a.wins ||
        a.name.localeCompare(b.name),
    );

    return {
      tournament,
      leaderboard: leaderboard.map(
        (player: LeaderboardPlayer, index: number) => ({
          rank: index + 1,
          ...player,
        }),
      ),
    };
  }
}
