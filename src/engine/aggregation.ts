const finiteSum = (left: number, right: number): number => {
  const result = left + right;
  if (!Number.isFinite(result)) throw new Error("SUM overflow: Sales totals exceed the finite numeric range. Reduce the source values before rendering or exporting.");
  return result;
};
export const sumValues = (values: readonly number[]): number => values.reduce(finiteSum, 0);
export const addToAggregate = (aggregates: Map<string, number>, key: string, value: number): void => {
  aggregates.set(key, finiteSum(aggregates.get(key) ?? 0, value));
};
