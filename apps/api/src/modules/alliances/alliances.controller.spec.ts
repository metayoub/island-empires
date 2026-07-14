import { AlliancesController } from './alliances.controller';

describe('AlliancesController cooperation routes', () => {
  const service = {
    getCooperation: jest.fn(),
    donate: jest.fn(),
    startProject: jest.fn(),
    createHelpRequest: jest.fn(),
    createTradeRequest: jest.fn(),
    shareBattleReport: jest.fn(),
  } as any;
  const controller = new AlliancesController(service);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates cooperation overview requests', () => {
    controller.getCooperation('alliance-1');

    expect(service.getCooperation).toHaveBeenCalledWith('alliance-1');
  });

  it('delegates treasury donations', () => {
    const body = { cityId: 'city-1', wood: 100, gold: 0, marble: 0, wine: 0, crystal: 0, sulfur: 0 };

    controller.donate('alliance-1', body);

    expect(service.donate).toHaveBeenCalledWith('alliance-1', body);
  });

  it('delegates project starts and cooperation shares', () => {
    controller.startProject('alliance-1', { projectType: 'trade_harbor' });
    controller.createHelpRequest('alliance-1', { kind: 'resources', message: 'Need marble.' });
    controller.createTradeRequest('alliance-1', {
      offeredResource: 'wood',
      offeredAmount: 100,
      requestedResource: 'marble',
      requestedAmount: 100,
    });
    controller.shareBattleReport('alliance-1', { reportId: 'report-1' });

    expect(service.startProject).toHaveBeenCalledWith('alliance-1', { projectType: 'trade_harbor' });
    expect(service.createHelpRequest).toHaveBeenCalledWith('alliance-1', { kind: 'resources', message: 'Need marble.' });
    expect(service.createTradeRequest).toHaveBeenCalledWith('alliance-1', {
      offeredResource: 'wood',
      offeredAmount: 100,
      requestedResource: 'marble',
      requestedAmount: 100,
    });
    expect(service.shareBattleReport).toHaveBeenCalledWith('alliance-1', { reportId: 'report-1' });
  });
});
