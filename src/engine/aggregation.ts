const MIN_SUBNORMAL_EXPONENT = -1074;
const SIGNIFICAND_BITS = 53;
const SIGN_MASK = 0x8000000000000000n;
const FRACTION_MASK = 0x000fffffffffffffn;
const EXPONENT_MASK = 0x7ffn;
const HIDDEN_BIT = 0x0010000000000000n;
const SUM_OVERFLOW_MESSAGE =
  "SUM overflow: Sales totals exceed the finite numeric range. Reduce the source values before rendering or exporting.";

const floatBuffer = new ArrayBuffer(8);
const floatView = new DataView(floatBuffer);

/**
 * Convert a finite IEEE-754 number to an integer scaled by 2^-1074.
 *
 * Every finite JavaScript number is an exact integer multiple of the minimum
 * positive subnormal value. Keeping that integer in a BigInt lets us defer
 * rounding until the complete SUM is known, so an intermediate `Infinity`
 * cannot hide a later cancellation.
 */
const scaledIntegerFor = (value: number): bigint => {
  floatView.setFloat64(0, value);
  const bits = floatView.getBigUint64(0);
  const sign = (bits & SIGN_MASK) === 0n ? 1n : -1n;
  const fraction = bits & FRACTION_MASK;
  const exponentBits = Number((bits >> 52n) & EXPONENT_MASK);

  if (exponentBits === 0) {
    return sign * fraction;
  }

  const significand = HIDDEN_BIT | fraction;
  const exponent = exponentBits - 1023 - 52;
  return sign * (significand << BigInt(exponent - MIN_SUBNORMAL_EXPONENT));
};

const numberForScaledInteger = (value: bigint): number => {
  if (value === 0n) return 0;

  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const bitLength = absolute.toString(2).length;
  const highestExponent = bitLength - 1 + MIN_SUBNORMAL_EXPONENT;
  if (highestExponent > 1023) throw new Error(SUM_OVERFLOW_MESSAGE);

  let shift = Math.max(0, bitLength - SIGNIFICAND_BITS);
  let significand = shift === 0 ? absolute : absolute >> BigInt(shift);

  // Round the exact integer to the nearest representable binary significand,
  // using ties-to-even just like the JavaScript Number format.
  if (shift > 0) {
    const remainderMask = (1n << BigInt(shift)) - 1n;
    const remainder = absolute & remainderMask;
    const halfway = 1n << BigInt(shift - 1);
    if (remainder > halfway || (remainder === halfway && (significand & 1n) === 1n)) {
      significand += 1n;
    }

    if (significand === (1n << BigInt(SIGNIFICAND_BITS))) {
      significand >>= 1n;
      shift += 1;
    }
  }

  const result = Number(significand) * 2 ** (MIN_SUBNORMAL_EXPONENT + shift);
  if (!Number.isFinite(result)) throw new Error(SUM_OVERFLOW_MESSAGE);
  return negative ? -result : result;
};

export const sumValues = (values: readonly number[]): number => {
  let scaledTotal = 0n;
  for (const value of values) {
    if (!Number.isFinite(value)) throw new Error(SUM_OVERFLOW_MESSAGE);
    scaledTotal += scaledIntegerFor(value);
  }
  return numberForScaledInteger(scaledTotal);
};

export const addToAggregate = (aggregates: Map<string, number[]>, key: string, value: number): void => {
  const values = aggregates.get(key);
  if (values) values.push(value);
  else aggregates.set(key, [value]);
};

export const finalizeAggregates = (aggregateValues: Map<string, number[]>): Map<string, number> => {
  const aggregates = new Map<string, number>();
  aggregateValues.forEach((values, key) => aggregates.set(key, sumValues(values)));
  return aggregates;
};
