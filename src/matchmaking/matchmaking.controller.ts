import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MatchmakingService } from './matchmaking.service';

interface AuthRequest extends Request {
  user: {
    sub: number;
    email: string;
    role: 'coach' | 'student';
  };
}

@ApiTags('Matchmaking')
@Controller('api/v1/tournaments')
export class MatchmakingController {
  constructor(private readonly service: MatchmakingService) {}

  @Post(':id/find-opponent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Find an opponent for a tournament' })
  findOpponent(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.findOpponent(id, req.user.sub);
  }
}
