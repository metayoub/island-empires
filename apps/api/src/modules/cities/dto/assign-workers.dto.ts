import { IsInt, Min } from 'class-validator';

export class AssignWorkersDto {
  @IsInt()
  @Min(0)
  woodWorkers!: number;

  @IsInt()
  @Min(0)
  goldWorkers!: number;

  @IsInt()
  @Min(0)
  luxuryWorkers!: number;

  @IsInt()
  @Min(0)
  scientists!: number;
}
