import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';

import { eq, desc, and } from 'drizzle-orm';
import { DATABASE } from '../db/database.module';
import { tournaments, tournamentParticipants, matches } from '../db/schema';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async create(dto: CreateTournamentDto, coachId: number) {
    const [tournament] = await this.db
      .insert(tournaments)
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
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt));
  }

  async findOne(id: number) {
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id))
      .limit(1);

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
  }

  async updateStatus(
    id: number,
    status: 'draft' | 'open' | 'ongoing' | 'completed',
  ) {
    const existing = await this.findOne(id);

    if (existing.status === 'completed') {
      throw new BadRequestException('Completed tournaments cannot be reopened');
    }

    const [updated] = await this.db
      .update(tournaments)
      .set({ status })
      .where(eq(tournaments.id, id))
      .returning();

    return updated;
  }

  async joinTournament(tournamentId: number, studentId: number) {
    // 1. Check whether tournament exists
    const tournament = await this.findOne(tournamentId);

    // 2. Only open tournaments can be joined
    if (tournament.status !== 'open') {
      throw new BadRequestException('Only open tournaments can be joined');
    }

    // 3. Check for an existing registration
    const [existingParticipant] = await this.db
      .select()
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, studentId),
        ),
      )
      .limit(1);

    if (existingParticipant) {
      throw new ConflictException('You have already joined this tournament');
    }

    // 4. Register student
    try {
      const [participant] = await this.db
        .insert(tournamentParticipants)
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
    } catch (error) {
      // Database unique constraint also protects against
      // simultaneous duplicate join requests.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('You have already joined this tournament');
      }

      throw error;
    }
  }

  async getTournamentStats(tournamentId: number) {
    if (!Number.isInteger(tournamentId) || tournamentId < 1) {
      throw new BadRequestException('Invalid tournamentId');
    }

    const [tournament] = await this.db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        status: tournaments.status,
      })
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const participants = await this.db
      .select({
        userId: tournamentParticipants.userId,
      })
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId));

    const tournamentMatches = await this.db
      .select({
        id: matches.id,
        status: matches.status,
        result: matches.result,
      })
      .from(matches)
      .where(eq(matches.tournamentId, tournamentId));

    return {
      tournament,
      stats: {
        totalParticipants: participants.length,
        totalMatches: tournamentMatches.length,
        ongoingMatches: tournamentMatches.filter(
          (match: { status: string }) => match.status === 'ongoing',
        ).length,
        completedMatches: tournamentMatches.filter(
          (match: { status: string }) => match.status === 'completed',
        ).length,
      },
    };
  }

  async update(
    tournamentId: number,
    coachId: number,
    dto: UpdateTournamentDto,
  ) {
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.createdBy !== coachId) {
      throw new ForbiddenException('You can only update your own tournaments');
    }

    if (tournament.status === 'completed') {
      throw new BadRequestException('Completed tournaments cannot be updated');
    }

    const [updated] = await this.db
      .update(tournaments)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.timeControl !== undefined && {
          timeControl: dto.timeControl,
        }),
        ...(dto.startAt !== undefined && {
          startAt: new Date(dto.startAt),
        }),
      })
      .where(eq(tournaments.id, tournamentId))
      .returning();

    return updated;
  }

  async remove(tournamentId: number, coachId: number) {
    const [tournament] = await this.db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.createdBy !== coachId) {
      throw new ForbiddenException('You can only delete your own tournaments');
    }

    if (tournament.status === 'ongoing') {
      throw new BadRequestException('Ongoing tournaments cannot be deleted');
    }

    await this.db.delete(tournaments).where(eq(tournaments.id, tournamentId));

    return { id: tournamentId };
  }
}
