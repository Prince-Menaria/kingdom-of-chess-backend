import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { TournamentsService } from './tournaments.service';
import { ApiCookieAuth } from '@nestjs/swagger';

type AuthRequest = Request & {
  user: { sub: number; email: string; role: 'coach' | 'student' };
};

@Controller('api/v1/tournaments')
export class TournamentsController {
  constructor(private readonly service: TournamentsService) {}

  @Get()
  async findAll() {
    return {
      success: true,
      data: await this.service.findAll(),
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return {
      success: true,
      data: await this.service.findOne(id),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('coach')
  async create(@Body() dto: CreateTournamentDto, @Req() req: AuthRequest) {
    return {
      success: true,
      data: await this.service.create(dto, req.user.sub),
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('coach')
  @ApiCookieAuth('access_token')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTournamentStatusDto,
  ) {
    return {
      success: true,
      data: await this.service.updateStatus(id, dto.status),
    };
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @ApiCookieAuth('access_token')
  async joinTournament(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    const participant = await this.service.joinTournament(id, req.user.sub);

    return {
      success: true,
      message: 'Tournament joined successfully',
      data: participant,
    };
  }
}
