import { IsObject, IsString } from 'class-validator';
import type { TransportPayload } from '@island-empires/shared-types';

export class StartResourceTransportDto {
  @IsString()
  originCityId!: string;

  @IsString()
  destinationCityId!: string;

  @IsObject()
  resources!: TransportPayload;
}
