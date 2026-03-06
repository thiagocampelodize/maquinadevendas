export const MIN_VALID_GOAL = 1;

export const hasValidGoal = (goal?: number | null): boolean => {
  if (goal === null || goal === undefined) return false;
  return goal >= MIN_VALID_GOAL;
};
