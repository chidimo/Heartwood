type ClassValue = string | false | null | undefined;

/** Joins class names, skipping falsy values, so conditions stay out of template strings. */
export const cn = (...values: ClassValue[]): string => values.filter(Boolean).join(' ');
