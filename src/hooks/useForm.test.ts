import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useForm } from "./useForm";
import { compose, email, required } from "../utils/validation";

interface SampleForm {
  name: string;
  email: string;
}

describe("useForm", () => {
  it("tracks initial values, dirty state, and touched state", () => {
    const { result } = renderHook(() =>
      useForm<SampleForm>({
        initialValues: { name: "Ada", email: "" },
        validators: {
          name: required("Name is required"),
          email: compose(required("Email is required"), email("Invalid email")),
        },
      }),
    );

    expect(result.current.isDirty).toBe(false);
    expect(result.current.dirtyFields).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isValid).toBe(true);

    act(() => {
      result.current.setFieldValue("name", "Grace");
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.dirtyFields).toEqual({ name: true });

    act(() => {
      result.current.setFieldValue("name", "Ada");
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.dirtyFields).toEqual({});
  });

  it("validates on blur and re-validates touched fields on change", () => {
    const { result } = renderHook(() =>
      useForm<SampleForm>({
        initialValues: { name: "", email: "" },
        validators: {
          email: compose(required("Email is required"), email("Invalid email")),
        },
        validateOnBlur: true,
      }),
    );

    act(() => {
      result.current.handleBlur("email");
    });

    expect(result.current.touched.email).toBe(true);
    expect(result.current.errors.email).toBe("Email is required");

    act(() => {
      result.current.setFieldValue("email", "bad");
    });

    expect(result.current.errors.email).toBe("Invalid email");

    act(() => {
      result.current.setFieldValue("email", "ada@example.com");
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it("calls onInvalid when validation fails on submit and onValid when valid", () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    const { result } = renderHook(() =>
      useForm<SampleForm>({
        initialValues: { name: "", email: "" },
        validators: {
          name: required("Name is required"),
          email: required("Email is required"),
        },
        validateOnBlur: false,
      }),
    );

    act(() => {
      result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith({
      name: "Name is required",
      email: "Email is required",
    });
    expect(result.current.hasSubmitted).toBe(true);

    act(() => {
      result.current.setFieldValue("name", "Ada");
      result.current.setFieldValue("email", "ada@example.com");
    });

    expect(result.current.errors).toEqual({});

    act(() => {
      result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(onValid).toHaveBeenCalledWith({
      name: "Ada",
      email: "ada@example.com",
    });
  });

  it("supports async validators and ignores stale validation results", async () => {
    let resolveFirst!: (value: string | undefined) => void;
    let resolveSecond!: (value: string | undefined) => void;

    const asyncValidator = vi
      .fn<(value: string) => Promise<string | undefined>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const { result } = renderHook(() =>
      useForm<{ username: string }>({
        initialValues: { username: "" },
        validators: { username: asyncValidator },
        validateOnChange: true,
      }),
    );

    act(() => {
      result.current.setFieldValue("username", "first");
    });
    expect(result.current.isValidating).toBe(true);
    expect(result.current.validatingFields.username).toBe(true);

    act(() => {
      result.current.setFieldValue("username", "second");
    });

    await act(async () => {
      resolveSecond(undefined);
    });
    expect(result.current.errors.username).toBeUndefined();
    expect(result.current.isValidating).toBe(false);

    // Stale first validation resolves with an error after the second already succeeded
    await act(async () => {
      resolveFirst("Taken");
    });
    expect(result.current.errors.username).toBeUndefined();
  });

  it("resets values, errors, touched, and submitted state", () => {
    const { result } = renderHook(() =>
      useForm<SampleForm>({
        initialValues: { name: "Ada", email: "" },
        validators: { email: required("Email is required") },
      }),
    );

    act(() => {
      result.current.setFieldValue("name", "Grace");
      result.current.handleSubmit(vi.fn())();
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.hasSubmitted).toBe(true);
    expect(result.current.errors.email).toBe("Email is required");

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual({ name: "Ada", email: "" });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.hasSubmitted).toBe(false);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });
});
