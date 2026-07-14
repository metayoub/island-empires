import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { PvpController } from './pvp.controller';

describe('PvpController routes', () => {
  it('registers the attack-options route used by the frontend', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PvpController)).toBe('pvp');
    expect(Reflect.getMetadata(PATH_METADATA, PvpController.prototype.getAttackOptions)).toBe(
      'cities/:targetCityId/attack-options',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, PvpController.prototype.getAttackOptions)).toBe(
      RequestMethod.GET,
    );
  });
});
