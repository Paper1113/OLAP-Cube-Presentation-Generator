export const uniqueErrors = (errors: readonly string[]): string[] => [...new Set(errors)];
