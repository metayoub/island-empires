export type QuestTriggerEvaluationInput = {
  currentStatus: string;
  currentProgress: number;
  target: number;
  questTrigger: string;
  firedTrigger: string;
  payloadMatch?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export type QuestTriggerEvaluationResult = {
  matched: boolean;
  newProgress: number;
  isNewlyCompleted: boolean;
};

export function evaluateQuestTrigger(input: QuestTriggerEvaluationInput): QuestTriggerEvaluationResult {
  const noMatch: QuestTriggerEvaluationResult = {
    matched: false,
    newProgress: input.currentProgress,
    isNewlyCompleted: false,
  };

  if (input.currentStatus !== 'active') {
    return noMatch;
  }

  if (input.questTrigger !== input.firedTrigger) {
    return noMatch;
  }

  if (input.payloadMatch) {
    const payload = input.payload ?? {};
    const payloadMatches = Object.entries(input.payloadMatch).every(
      ([key, value]) => payload[key] === value,
    );

    if (!payloadMatches) {
      return noMatch;
    }
  }

  const newProgress = Math.min(input.target, input.currentProgress + 1);

  return {
    matched: true,
    newProgress,
    isNewlyCompleted: newProgress >= input.target,
  };
}
