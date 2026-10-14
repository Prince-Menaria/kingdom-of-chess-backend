
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateTournamentDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+\+\d+$/, {
    message: 'timeControl must be in format 5+0 or 10+5',
  })
  timeControl?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;
}
