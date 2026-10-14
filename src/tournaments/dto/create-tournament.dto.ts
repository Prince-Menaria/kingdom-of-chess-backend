import {
  IsDateString,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name!: string;

  @IsString()
  @Matches(/^\d{1,3}\+\d{1,2}$/)
  timeControl!: string;

  @IsDateString()
  startAt!: string;
}
