export type ValidationResult = string | undefined;

export type Validator<T = string, TValues = unknown> = (
  value: T,
  values?: TValues,
) => ValidationResult;

export type AsyncValidator<T = string, TValues = unknown> = (
  value: T,
  values?: TValues,
) => Promise<ValidationResult>;

export type FieldValidator<T = string, TValues = unknown> = (
  value: T,
  values?: TValues,
) => ValidationResult | Promise<ValidationResult>;

export interface RequiredOptions {
  trim?: boolean;
}

export interface LengthOptions {
  min?: number;
  max?: number;
  minMessage?: string;
  maxMessage?: string;
  message?: string;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const URL_REGEX = /^https?:\/\/.+/;

export function required(
  message = "This field is required",
  options: RequiredOptions = {},
): Validator<unknown> {
  const { trim = true } = options;
  return (value) => {
    if (value === null || value === undefined) {
      return message;
    }
    if (typeof value === "string") {
      const normalized = trim ? value.trim() : value;
      return normalized.length === 0 ? message : undefined;
    }
    return undefined;
  };
}

export function email(
  message = "Please enter a valid email address.",
): Validator<string> {
  return (value) => {
    if (!value || !value.trim()) {
      return undefined;
    }
    return EMAIL_REGEX.test(value.trim()) ? undefined : message;
  };
}

export function url(
  message = "Enter a valid URL starting with http:// or https://",
): Validator<string> {
  return (value) => {
    if (!value) {
      return undefined;
    }
    return URL_REGEX.test(value) ? undefined : message;
  };
}

export function minLength(
  min: number,
  message?: string,
): Validator<string> {
  return (value) => {
    if (!value) {
      return undefined;
    }
    return value.length < min
      ? (message ?? `Must be at least ${min} characters`)
      : undefined;
  };
}

export function maxLength(
  max: number,
  message?: string,
): Validator<string> {
  return (value) => {
    if (!value) {
      return undefined;
    }
    return value.length > max
      ? (message ?? `Must be at most ${max} characters`)
      : undefined;
  };
}

export function length(options: LengthOptions): Validator<string> {
  const { min, max, minMessage, maxMessage, message } = options;
  return (value) => {
    if (!value) {
      return undefined;
    }
    if (min !== undefined && value.length < min) {
      return minMessage ?? message ?? `Must be at least ${min} characters`;
    }
    if (max !== undefined && value.length > max) {
      return maxMessage ?? message ?? `Must be at most ${max} characters`;
    }
    return undefined;
  };
}

export function pattern(
  regex: RegExp,
  message = "Invalid format",
): Validator<string> {
  return (value) => {
    if (!value) {
      return undefined;
    }
    return regex.test(value) ? undefined : message;
  };
}

export function compose<T = string, TValues = unknown>(
  ...validators: Array<Validator<T, TValues>>
): Validator<T, TValues> {
  return (value, values) => {
    for (const validator of validators) {
      const error = validator(value, values);
      if (error !== undefined) {
        return error;
      }
    }
    return undefined;
  };
}

export function composeAsync<T = string, TValues = unknown>(
  ...validators: Array<FieldValidator<T, TValues>>
): AsyncValidator<T, TValues> {
  return async (value, values) => {
    for (const validator of validators) {
      const error = await validator(value, values);
      if (error !== undefined) {
        return error;
      }
    }
    return undefined;
  };
}
