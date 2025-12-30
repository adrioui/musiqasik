import { describe, expect, it } from "vitest";
import {
  DatabaseError,
  LastFmApiError,
  NetworkError,
  ValidationError,
} from "./errors";

describe("Error Classes", () => {
  describe("LastFmApiError", () => {
    it("should create an error with message", () => {
      const error = new LastFmApiError({ message: "API failed" });
      expect(error.message).toBe("API failed");
      expect(error._tag).toBe("LastFmApiError");
    });

    it("should include status code", () => {
      const error = new LastFmApiError({ message: "Not found", status: 404 });
      expect(error.status).toBe(404);
    });
  });

  describe("DatabaseError", () => {
    it("should create a database error", () => {
      const error = new DatabaseError({
        message: "Connection failed",
        code: "ECONNREFUSED",
      });
      expect(error.message).toBe("Connection failed");
      expect(error.code).toBe("ECONNREFUSED");
      expect(error._tag).toBe("DatabaseError");
    });
  });

  describe("NetworkError", () => {
    it("should create a network error", () => {
      const error = new NetworkError({ message: "Fetch failed" });
      expect(error.message).toBe("Fetch failed");
      expect(error._tag).toBe("NetworkError");
    });
  });

  describe("ValidationError", () => {
    it("should create a validation error", () => {
      const error = new ValidationError({ message: "Invalid response" });
      expect(error.message).toBe("Invalid response");
      expect(error._tag).toBe("ValidationError");
    });

    it("should include validation errors", () => {
      const parseErrors = { field: "name", issue: "required" };
      const error = new ValidationError({
        message: "Validation failed",
        errors: parseErrors,
      });
      expect(error.errors).toEqual(parseErrors);
    });
  });
});
