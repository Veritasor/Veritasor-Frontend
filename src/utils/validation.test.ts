import { describe, expect, it } from "vitest";
import {
  compose,
  composeAsync,
  email,
  length,
  maxLength,
  minLength,
  pattern,
  required,
  url,
} from "./validation";

describe("validation utilities", () => {
  describe("required", () => {
    it("rejects empty strings, whitespace, null, and undefined by default", () => {
      const validate = required();
      expect(validate("")).toBe("This field is required");
      expect(validate("   \t\n")).toBe("This field is required");
      expect(validate(null)).toBe("This field is required");
      expect(validate(undefined)).toBe("This field is required");
    });

    it("accepts non-empty strings and non-null values", () => {
      const validate = required("Custom required");
      expect(validate("hello")).toBeUndefined();
      expect(validate("  hello  ")).toBeUndefined();
      expect(validate(0)).toBeUndefined();
      expect(validate(false)).toBeUndefined();
    });

    it("supports custom messages and trim: false", () => {
      const validate = required("Country is required", { trim: false });
      expect(validate("")).toBe("Country is required");
      expect(validate("   ")).toBeUndefined();
    });
  });

  describe("email", () => {
    it("allows empty or whitespace-only values (optional unless paired with required)", () => {
      const validate = email();
      expect(validate("")).toBeUndefined();
      expect(validate("   ")).toBeUndefined();
    });

    it("accepts valid email addresses", () => {
      const validate = email();
      expect(validate("founder@veritasor.com")).toBeUndefined();
      expect(validate("  alice.smith+tag@sub.example.co.uk  ")).toBeUndefined();
    });

    it("rejects invalid email addresses with default or custom message", () => {
      const defaultValidate = email();
      expect(defaultValidate("not-an-email")).toBe(
        "Please enter a valid email address.",
      );
      expect(defaultValidate("missing@domain")).toBe(
        "Please enter a valid email address.",
      );
      expect(defaultValidate("@no-user.com")).toBe(
        "Please enter a valid email address.",
      );
      expect(defaultValidate("space in@email.com")).toBe(
        "Please enter a valid email address.",
      );

      const customValidate = email("Invalid email");
      expect(customValidate("bad")).toBe("Invalid email");
    });
  });

  describe("url", () => {
    it("allows empty values (optional unless paired with required)", () => {
      const validate = url();
      expect(validate("")).toBeUndefined();
    });

    it("accepts http:// and https:// URLs", () => {
      const validate = url();
      expect(validate("http://acmecorp.com")).toBeUndefined();
      expect(validate("https://acmecorp.com")).toBeUndefined();
      expect(validate("https://acmecorp.com/path?q=1#frag")).toBeUndefined();
    });

    it("rejects non-http(s) URLs with default or custom message", () => {
      const defaultValidate = url();
      expect(defaultValidate("acmecorp.com")).toBe(
        "Enter a valid URL starting with http:// or https://",
      );
      expect(defaultValidate("ftp://acmecorp.com")).toBe(
        "Enter a valid URL starting with http:// or https://",
      );
      expect(defaultValidate("https://")).toBe(
        "Enter a valid URL starting with http:// or https://",
      );

      const customValidate = url("Bad URL");
      expect(customValidate("invalid")).toBe("Bad URL");
    });
  });

  describe("minLength", () => {
    it("allows empty values", () => {
      expect(minLength(3)("")).toBeUndefined();
    });

    it("validates minimum length with default and custom messages", () => {
      const defaultValidate = minLength(5);
      expect(defaultValidate("abc")).toBe("Must be at least 5 characters");
      expect(defaultValidate("abcde")).toBeUndefined();

      const customValidate = minLength(5, "Too short");
      expect(customValidate("ab")).toBe("Too short");
    });
  });

  describe("maxLength", () => {
    it("allows empty values", () => {
      expect(maxLength(3)("")).toBeUndefined();
    });

    it("validates maximum length with default and custom messages", () => {
      const defaultValidate = maxLength(4);
      expect(defaultValidate("abcde")).toBe("Must be at most 4 characters");
      expect(defaultValidate("abcd")).toBeUndefined();

      const customValidate = maxLength(4, "Too long");
      expect(customValidate("abcde")).toBe("Too long");
    });
  });

  describe("length", () => {
    it("allows empty values", () => {
      expect(length({ min: 2, max: 5 })("")).toBeUndefined();
    });

    it("validates both min and max bounds", () => {
      const validate = length({ min: 3, max: 6 });
      expect(validate("ab")).toBe("Must be at least 3 characters");
      expect(validate("abcdefg")).toBe("Must be at most 6 characters");
      expect(validate("abc")).toBeUndefined();
      expect(validate("abcdef")).toBeUndefined();
    });

    it("uses specific minMessage/maxMessage or fallback message", () => {
      const specific = length({
        min: 3,
        max: 5,
        minMessage: "Min 3",
        maxMessage: "Max 5",
      });
      expect(specific("a")).toBe("Min 3");
      expect(specific("abcdef")).toBe("Max 5");

      const fallback = length({ min: 3, max: 5, message: "Between 3 and 5" });
      expect(fallback("a")).toBe("Between 3 and 5");
      expect(fallback("abcdef")).toBe("Between 3 and 5");
    });
  });

  describe("pattern", () => {
    it("allows empty values", () => {
      expect(pattern(/^\d+$/)("")).toBeUndefined();
    });

    it("validates against a regular expression", () => {
      const digitsOnly = pattern(/^\d+$/, "Digits only");
      expect(digitsOnly("12345")).toBeUndefined();
      expect(digitsOnly("123a")).toBe("Digits only");
      expect(pattern(/^[A-Z]+$/)("abc")).toBe("Invalid format");
    });
  });

  describe("compose", () => {
    it("runs synchronous validators in order and returns the first error", () => {
      const validate = compose(
        required("Email is required."),
        email("Invalid email."),
        maxLength(20, "Too long."),
      );
      expect(validate("")).toBe("Email is required.");
      expect(validate("bad")).toBe("Invalid email.");
      expect(validate("very.long.email.address@example.com")).toBe("Too long.");
      expect(validate("ok@example.com")).toBeUndefined();
    });
  });

  describe("composeAsync", () => {
    it("runs sync and async validators in order and returns the first error", async () => {
      const checkTaken = async (value: string) =>
        value === "taken@example.com" ? "Already taken" : undefined;

      const validate = composeAsync(
        required("Email is required."),
        email("Invalid email."),
        checkTaken,
      );

      expect(await validate("")).toBe("Email is required.");
      expect(await validate("bad")).toBe("Invalid email.");
      expect(await validate("taken@example.com")).toBe("Already taken");
      expect(await validate("free@example.com")).toBeUndefined();
    });
  });
});
