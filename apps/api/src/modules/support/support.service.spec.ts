import { ConfigService } from '@nestjs/config';
import { SupportService } from './support.service';

describe('SupportService', () => {
  it('accepts and logs a support request', () => {
    const service = new SupportService({
      get: jest.fn().mockReturnValue('support@islandempires.local'),
    } as unknown as ConfigService);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const result = service.contact({
      category: 'bug',
      subject: 'Building timer issue',
      message: 'My building timer completed but the level did not update.',
    });

    expect(result.success).toBe(true);
    expect(result.requestId).toMatch(/^support_/);
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
