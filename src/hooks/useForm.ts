import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import type { FieldValidator, ValidationResult } from "../utils/validation";

export type FormErrors<T> = Partial<Record<keyof T, string>>;
export type FormTouched<T> = Partial<Record<keyof T, boolean>>;
export type FormDirtyFields<T> = Partial<Record<keyof T, boolean>>;
export type FormValidatingFields<T> = Partial<Record<keyof T, boolean>>;

export type FormValidators<T> = {
  [K in keyof T]?: FieldValidator<T[K], T>;
};

export interface UseFormOptions<T extends object> {
  initialValues: T;
  validators?: FormValidators<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  revalidateOnChangeAfterSubmit?: boolean;
}

export interface UseFormReturn<T extends object> {
  values: T;
  errors: FormErrors<T>;
  touched: FormTouched<T>;
  dirtyFields: FormDirtyFields<T>;
  validatingFields: FormValidatingFields<T>;
  isDirty: boolean;
  isValid: boolean;
  isValidating: boolean;
  hasSubmitted: boolean;
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldTouched: <K extends keyof T>(field: K, isTouched?: boolean) => void;
  setFieldError: <K extends keyof T>(field: K, error: ValidationResult) => void;
  handleBlur: <K extends keyof T>(field: K) => void;
  validateField: <K extends keyof T>(
    field: K,
    overrideValues?: T,
  ) => ValidationResult | Promise<ValidationResult>;
  validateForm: (overrideValues?: T) => FormErrors<T> | Promise<FormErrors<T>>;
  handleSubmit: (
    onValid: (values: T) => void | Promise<void>,
    onInvalid?: (errors: FormErrors<T>) => void,
  ) => (e?: FormEvent) => void;
  reset: (nextInitialValues?: T) => void;
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

export function useForm<T extends object>({
  initialValues,
  validators = {},
  validateOnChange = false,
  validateOnBlur = true,
  revalidateOnChangeAfterSubmit = true,
}: UseFormOptions<T>): UseFormReturn<T> {
  const initialRef = useRef<T>(initialValues);
  const validatorsRef = useRef<FormValidators<T>>(validators);
  validatorsRef.current = validators;

  const [values, setValues] = useState<T>(initialValues);
  const valuesRef = useRef<T>(values);
  valuesRef.current = values;

  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<FormTouched<T>>({});
  const touchedRef = useRef<FormTouched<T>>(touched);
  touchedRef.current = touched;

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const hasSubmittedRef = useRef(hasSubmitted);
  hasSubmittedRef.current = hasSubmitted;

  const [validatingFields, setValidatingFields] = useState<
    FormValidatingFields<T>
  >({});

  const fieldValidationSeqRef = useRef<Partial<Record<keyof T, number>>>({});

  const dirtyFields = useMemo(() => {
    const dirty: FormDirtyFields<T> = {};
    (Object.keys(values) as Array<keyof T>).forEach((key) => {
      if (values[key] !== initialRef.current[key]) {
        dirty[key] = true;
      }
    });
    return dirty;
  }, [values]);

  const isDirty = useMemo(
    () => Object.values(dirtyFields).some(Boolean),
    [dirtyFields],
  );

  const isValidating = useMemo(
    () => Object.values(validatingFields).some(Boolean),
    [validatingFields],
  );

  const isValid = useMemo(
    () => Object.values(errors).every((err) => !err),
    [errors],
  );

  const setFieldError = useCallback(
    <K extends keyof T>(field: K, error: ValidationResult) => {
      setErrors((prev) => {
        if (error) {
          if (prev[field] === error) return prev;
          return { ...prev, [field]: error };
        }
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const validateField = useCallback(
    <K extends keyof T>(
      field: K,
      overrideValues?: T,
    ): ValidationResult | Promise<ValidationResult> => {
      const currentValues = overrideValues ?? valuesRef.current;
      const validator = validatorsRef.current[field];
      const nextSeq = (fieldValidationSeqRef.current[field] ?? 0) + 1;
      fieldValidationSeqRef.current[field] = nextSeq;

      if (!validator) {
        setFieldError(field, undefined);
        return undefined;
      }

      const result = validator(currentValues[field], currentValues);
      if (isPromise<ValidationResult>(result)) {
        setValidatingFields((prev) => ({ ...prev, [field]: true }));
        return result.then((asyncError) => {
          if (fieldValidationSeqRef.current[field] === nextSeq) {
            setFieldError(field, asyncError);
            setValidatingFields((prev) => {
              const next = { ...prev };
              delete next[field];
              return next;
            });
          }
          return asyncError;
        });
      }

      setFieldError(field, result);
      return result;
    },
    [setFieldError],
  );

  const validateForm = useCallback(
    (overrideValues?: T): FormErrors<T> | Promise<FormErrors<T>> => {
      const currentValues = overrideValues ?? valuesRef.current;
      const keys = Object.keys(validatorsRef.current) as Array<keyof T>;
      const syncErrors: FormErrors<T> = {};
      const pending: Array<Promise<void>> = [];

      for (const key of keys) {
        const validator = validatorsRef.current[key];
        if (!validator) continue;
        const nextSeq = (fieldValidationSeqRef.current[key] ?? 0) + 1;
        fieldValidationSeqRef.current[key] = nextSeq;

        const result = validator(currentValues[key], currentValues);
        if (isPromise<ValidationResult>(result)) {
          setValidatingFields((prev) => ({ ...prev, [key]: true }));
          pending.push(
            result.then((asyncError) => {
              if (fieldValidationSeqRef.current[key] === nextSeq) {
                if (asyncError) {
                  syncErrors[key] = asyncError;
                }
                setValidatingFields((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                });
              }
            }),
          );
        } else if (result) {
          syncErrors[key] = result;
        }
      }

      if (pending.length > 0) {
        return Promise.all(pending).then(() => {
          setErrors(syncErrors);
          return syncErrors;
        });
      }

      setErrors(syncErrors);
      return syncErrors;
    },
    [],
  );

  const setFieldValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      const nextValues = { ...valuesRef.current, [field]: value };
      valuesRef.current = nextValues;
      setValues(nextValues);

      const shouldValidate =
        validateOnChange ||
        (revalidateOnChangeAfterSubmit && hasSubmittedRef.current) ||
        (validateOnBlur && Boolean(touchedRef.current[field]));

      if (shouldValidate) {
        void validateField(field, nextValues);
      }
    },
    [
      validateOnChange,
      revalidateOnChangeAfterSubmit,
      validateOnBlur,
      validateField,
    ],
  );

  const setFieldTouched = useCallback(
    <K extends keyof T>(field: K, isTouched = true) => {
      const nextTouched = { ...touchedRef.current, [field]: isTouched };
      touchedRef.current = nextTouched;
      setTouched(nextTouched);
      if (isTouched && validateOnBlur) {
        void validateField(field);
      }
    },
    [validateOnBlur, validateField],
  );

  const handleBlur = useCallback(
    <K extends keyof T>(field: K) => {
      setFieldTouched(field, true);
    },
    [setFieldTouched],
  );

  const handleSubmit = useCallback(
    (
      onValid: (values: T) => void | Promise<void>,
      onInvalid?: (errors: FormErrors<T>) => void,
    ) =>
      (e?: FormEvent) => {
        if (e) {
          e.preventDefault();
        }
        hasSubmittedRef.current = true;
        setHasSubmitted(true);

        const allTouched: FormTouched<T> = {};
        (Object.keys(valuesRef.current) as Array<keyof T>).forEach((key) => {
          allTouched[key] = true;
        });
        touchedRef.current = allTouched;
        setTouched(allTouched);

        const validationResult = validateForm(valuesRef.current);
        if (isPromise<FormErrors<T>>(validationResult)) {
          void validationResult.then((errs) => {
            if (Object.keys(errs).length === 0) {
              void onValid(valuesRef.current);
            } else {
              onInvalid?.(errs);
            }
          });
          return;
        }

        if (Object.keys(validationResult).length === 0) {
          void onValid(valuesRef.current);
        } else {
          onInvalid?.(validationResult);
        }
      },
    [validateForm],
  );

  const reset = useCallback((nextInitialValues?: T) => {
    const next = nextInitialValues ?? initialRef.current;
    initialRef.current = next;
    valuesRef.current = next;
    setValues(next);
    setErrors({});
    touchedRef.current = {};
    setTouched({});
    hasSubmittedRef.current = false;
    setHasSubmitted(false);
    setValidatingFields({});
    fieldValidationSeqRef.current = {};
  }, []);

  return {
    values,
    errors,
    touched,
    dirtyFields,
    validatingFields,
    isDirty,
    isValid,
    isValidating,
    hasSubmitted,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    handleBlur,
    validateField,
    validateForm,
    handleSubmit,
    reset,
  };
}
