import { IsString, Length } from 'class-validator';

export class SendMessageDto {
  @IsString()
  recipientPlayerId!: string;

  @IsString()
  @Length(1, 80)
  subject!: string;

  @IsString()
  @Length(1, 2000)
  body!: string;
}
