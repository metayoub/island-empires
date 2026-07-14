import { IsOptional, IsString, Length } from 'class-validator';

export class BlockPlayerDto {
  @IsOptional()
  @IsString()
  @Length(1, 240)
  reason?: string;
}
