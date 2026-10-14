import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MatchesService } from './matches.service';

@Controller('api/v1/matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getMatchHistory(@Req() req: any) {
    const userId = Number(req.user.sub);

    return {
      success: true,
      data: await this.matchesService.getMatchHistory(userId),
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getMatchDetails(
    @Param('id', ParseIntPipe) matchId: number,
    @Req() req: any,
  ) {
    const userId = Number(req.user.sub);

    return {
      success: true,
      data: await this.matchesService.getMatchDetails(matchId, userId),
    };
  }

  @Post(':id/resign')
  @UseGuards(JwtAuthGuard)
  async resignMatch(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const data = await this.matchesService.resignMatch(id, req.user.sub);

    return {
      success: true,
      data,
    };
  }

  @Post(':id/draw')
  @UseGuards(JwtAuthGuard)
  async offerDraw(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return {
      success: true,
      data: await this.matchesService.offerDraw(id, req.user.sub),
    };
  }

  @Post(':id/draw/accept')
  @UseGuards(JwtAuthGuard)
  async acceptDraw(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return {
      success: true,
      data: await this.matchesService.acceptDraw(id, req.user.sub),
    };
  }
}
