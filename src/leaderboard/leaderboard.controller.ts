
import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('api/v1/leaderboard')
export class LeaderboardController {
  constructor(
    private readonly leaderboardService: LeaderboardService,
  ) {}

  @Get()
  async getLeaderboard(
    @Query('tournamentId', new DefaultValuePipe(0), ParseIntPipe)
    tournamentId: number,
  ) {
    if (tournamentId === 0) {
      return {
        success: true,
        data: [],
        message: 'Please provide a tournamentId to view its leaderboard',
      };
    }

    return {
      success: true,
      data: await this.leaderboardService.getLeaderboard(tournamentId),
    };
  }
}
