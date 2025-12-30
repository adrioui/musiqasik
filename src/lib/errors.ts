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

export class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string;
  errors?: unknown;
}> {}

export class ExportError extends Data.TaggedError("ExportError")<{
  message: string;
  cause?: unknown;
}> {}

export type AppError =
  | LastFmApiError
  | DatabaseError
  | NetworkError
  | ValidationError
  | ExportError;
