export const sumValues = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

export const addToAggregate = (
  aggregates: Map<string, number>,
  key: string,
  value: number,
): void => {
  aggregates.set(key, (aggregates.get(key) ?? 0) + value);
};
