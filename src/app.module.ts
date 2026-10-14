import { Module } from '@nestjs/common';
import { ConfigModule } from "@nestjs/config";
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from "./db/database.module";
import { HealthController } from './health.controller';
import { LeaderboardController } from './leaderboard/leaderboard.controller';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { LeaderboardService } from './leaderboard/leaderboard.service';
import { MatchesModule } from './matches/matches.module';
import { MatchmakingController } from './matchmaking/matchmaking.controller';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { MatchmakingService } from './matchmaking/matchmaking.service';
import { TournamentsModule } from './tournaments/tournaments.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    // ObserveModule.forRoot({
    //   appKey: 'YOUR_APP_KEY',
    //   appSecret: 'YOUR_APP_SECRET',
    //   serviceId: 'api',
    // }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    TournamentsModule,
    MatchmakingModule,
    MatchesModule,
    LeaderboardModule,
  ],
  controllers: [AppController, HealthController, MatchmakingController, LeaderboardController],
  providers: [AppService, MatchmakingService, LeaderboardService],
})
export class AppModule {}
