import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateAllianceDto {
  @IsString()
  @Length(3, 40)
  name!: string;

  @IsString()
  @Length(2, 5)
  @Matches(/^[A-Za-z0-9]+$/)
  tag!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
