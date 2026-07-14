import type { SpyMissionType } from './spy-defaults.js';

export type SpyResourceBalance = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export type SpyReportInput = {
  missionType: SpyMissionType;
  targetCityName: string;
  wasSuccessful: boolean;
  wasDetected: boolean;
  spyLost: boolean;
  resources?: SpyResourceBalance;
  units?: Record<string, number>;
  buildings?: Array<{ buildingType: string; name: string; level: number }>;
  defenderSpyCount?: number;
};

export type SpyReportOutput = {
  title: string;
  message: string;
  payload: Record<string, unknown>;
};

const RESOURCE_KEYS = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;

export function generateSpyReport(input: SpyReportInput): SpyReportOutput {
  const result = input.wasSuccessful ? 'Success' : 'Failed';
  const detection = input.wasDetected
    ? input.spyLost
      ? 'Your spy was detected and captured.'
      : 'Your spy was detected but escaped.'
    : 'Your spy was not detected.';

  if (!input.wasSuccessful) {
    return {
      title: 'Spy Report Failed',
      message: `Target: ${input.targetCityName}\n\nYour spy could not gather reliable information.\nDetection: ${detection}`,
      payload: {
        missionType: input.missionType,
        targetCityName: input.targetCityName,
        result,
        wasDetected: input.wasDetected,
        spyLost: input.spyLost,
      },
    };
  }

  if (input.missionType === 'resource_report') {
    const resources = RESOURCE_KEYS.map((resourceType) => ({
      resourceType,
      estimate: estimateResource(input.resources?.[resourceType] ?? 0),
    }));

    return {
      title: 'Spy Report: Resources',
      message: [
        `Target: ${input.targetCityName}`,
        '',
        `Result: ${result}`,
        '',
        'Estimated resources:',
        ...resources.map((resource) => `- ${capitalize(resource.resourceType)}: ${resource.estimate}`),
        '',
        `Detection: ${detection}`,
      ].join('\n'),
      payload: {
        missionType: input.missionType,
        targetCityName: input.targetCityName,
        result,
        resources,
        wasDetected: input.wasDetected,
        spyLost: input.spyLost,
      },
    };
  }

  if (input.missionType === 'army_report') {
    const units = Object.entries(input.units ?? {}).map(([unitType, quantity]) => ({
      unitType,
      estimate: estimateQuantity(quantity),
    }));
    const defenderSpyCount = input.defenderSpyCount ?? 0;
    const counterSpyPresence =
      defenderSpyCount >= 5 ? 'High' : defenderSpyCount >= 2 ? 'Moderate' : defenderSpyCount > 0 ? 'Low' : 'None';

    return {
      title: 'Spy Report: Army',
      message: [
        `Target: ${input.targetCityName}`,
        '',
        'Estimated army:',
        ...(units.length > 0
          ? units.map((unit) => `- ${formatUnit(unit.unitType)}: ${unit.estimate}`)
          : ['- No army presence observed']),
        '',
        `Counter-spy presence: ${counterSpyPresence}`,
        `Detection: ${detection}`,
      ].join('\n'),
      payload: {
        missionType: input.missionType,
        targetCityName: input.targetCityName,
        result,
        units,
        counterSpyPresence,
        wasDetected: input.wasDetected,
        spyLost: input.spyLost,
      },
    };
  }

  const buildings = (input.buildings ?? []).map((building) => ({
    buildingType: building.buildingType,
    name: building.name,
    level: building.level,
  }));

  return {
    title: 'Spy Report: Buildings',
    message: [
      `Target: ${input.targetCityName}`,
      '',
      'Visible buildings:',
      ...buildings.map((building) => `- ${building.name}: Level ${building.level}`),
      '',
      `Detection: ${detection}`,
    ].join('\n'),
    payload: {
      missionType: input.missionType,
      targetCityName: input.targetCityName,
      result,
      buildings,
      wasDetected: input.wasDetected,
      spyLost: input.spyLost,
    },
  };
}

function estimateResource(value: number): string {
  if (value <= 0) return 'None';
  if (value < 100) return 'Low';
  const bucket = Math.max(100, Math.round(value / 100) * 100);
  return `~${bucket.toLocaleString('en-US')}`;
}

function estimateQuantity(value: number): string {
  const quantity = Math.max(0, Math.floor(value));
  if (quantity <= 0) return 'None';
  if (quantity <= 5) return '1-5';
  const lower = Math.floor(quantity / 10) * 10;
  const upper = Math.max(lower + 10, Math.ceil(quantity / 10) * 10);
  return `${lower}-${upper}`;
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatUnit(value: string): string {
  return value
    .split('_')
    .map((part) => capitalize(part))
    .join(' ');
}
