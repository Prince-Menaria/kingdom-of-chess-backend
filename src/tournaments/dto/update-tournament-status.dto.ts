import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateTournamentStatusDto {
  @ApiProperty({
    example: 'open',
    enum: ['draft', 'open', 'ongoing', 'completed'],
  })
  @IsIn(['draft', 'open', 'ongoing', 'completed'])
  status!: 'draft' | 'open' | 'ongoing' | 'completed';
}
