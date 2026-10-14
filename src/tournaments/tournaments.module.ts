import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { RolesGuard } from '../auth/roles.guard';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TournamentsController],
  providers: [TournamentsService, RolesGuard]
})
export class TournamentsModule {}
