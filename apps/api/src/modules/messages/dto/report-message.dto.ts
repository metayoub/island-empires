import { IsString, Length } from 'class-validator';

export class ReportMessageDto {
  @IsString()
  @Length(3, 500)
  reason!: string;
}
