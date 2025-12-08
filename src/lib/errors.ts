import { Data } from "effect";

export class LastFmApiError extends Data.TaggedError("LastFmApiError")<{
  message: string;
  status?: number;
  cause?: unknown;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  message: string;
  code?: string;
  cause?: unknown;
}> {}

export class NetworkError extends Data.TaggedError("NetworkError")<{
  message: string;
  cause?: unknown;
}> {}

export class ArtistNotFoundError extends Data.TaggedError("ArtistNotFoundError")<{
  artistName: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string;
  field?: string;
}> {}

export type AppError = 
  | LastFmApiError
  | DatabaseError
  | NetworkError
  | ArtistNotFoundError
  | ValidationError;

export const handleUnknownError = (error: unknown): AppError => {
  if (error instanceof Error) {
    if (error.message.includes("network") || error.message.includes("fetch")) {
      return new NetworkError({ message: error.message, cause: error });
    }
    return new DatabaseError({ message: error.message, cause: error });
  }
  return new DatabaseError({ message: "Unknown error occurred" });
};
