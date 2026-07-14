import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/env';

export const defaultQueue = new Queue('island-empires-default', {
  connection: getRedisConnectionOptions(),
});
