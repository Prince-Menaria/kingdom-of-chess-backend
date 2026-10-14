import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';

import { eq, desc, and } from 'drizzle-orm';
import { DATABASE } from '../db/database.module';
import { tournaments, tournamentParticipants } from '../db/schema';
import { CreateTournamentDto } from './dto/create-tournament.dto';

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
}
