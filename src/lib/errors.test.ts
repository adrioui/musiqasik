import { describe, it, expect } from 'vitest';
import {
  LastFmApiError,
  DatabaseError,
  NetworkError,
  ArtistNotFoundError,
  ValidationError,
  handleUnknownError,
} from './errors';

describe('Error Classes', () => {
  describe('LastFmApiError', () => {
    it('should create an error with message', () => {
      const error = new LastFmApiError({ message: 'API failed' });
      expect(error.message).toBe('API failed');
      expect(error._tag).toBe('LastFmApiError');
    });

    it('should include status code', () => {
      const error = new LastFmApiError({ message: 'Not found', status: 404 });
      expect(error.status).toBe(404);
    });
  });

  describe('DatabaseError', () => {
    it('should create a database error', () => {
      const error = new DatabaseError({ message: 'Connection failed', code: 'ECONNREFUSED' });
      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('ECONNREFUSED');
      expect(error._tag).toBe('DatabaseError');
    });
  });

  describe('NetworkError', () => {
    it('should create a network error', () => {
      const error = new NetworkError({ message: 'Fetch failed' });
      expect(error.message).toBe('Fetch failed');
      expect(error._tag).toBe('NetworkError');
    });
  });

  describe('ArtistNotFoundError', () => {
    it('should create an artist not found error', () => {
      const error = new ArtistNotFoundError({ artistName: 'Unknown Artist' });
      expect(error.artistName).toBe('Unknown Artist');
      expect(error._tag).toBe('ArtistNotFoundError');
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error', () => {
      const error = new ValidationError({ message: 'Invalid input', field: 'name' });
      expect(error.message).toBe('Invalid input');
      expect(error.field).toBe('name');
      expect(error._tag).toBe('ValidationError');
    });
  });
});

describe('handleUnknownError', () => {
  it('should convert network errors', () => {
    const error = new Error('network request failed');
    const result = handleUnknownError(error);
    expect(result._tag).toBe('NetworkError');
    expect(result.message).toBe('network request failed');
  });

  it('should convert fetch errors', () => {
    const error = new Error('fetch failed');
    const result = handleUnknownError(error);
    expect(result._tag).toBe('NetworkError');
  });

  it('should convert unknown errors to DatabaseError', () => {
    const error = new Error('Something went wrong');
    const result = handleUnknownError(error);
    expect(result._tag).toBe('DatabaseError');
    expect(result.message).toBe('Something went wrong');
  });

  it('should handle non-Error objects', () => {
    const result = handleUnknownError('string error');
    expect(result._tag).toBe('DatabaseError');
    expect(result.message).toBe('Unknown error occurred');
  });

  it('should handle null', () => {
    const result = handleUnknownError(null);
    expect(result._tag).toBe('DatabaseError');
    expect(result.message).toBe('Unknown error occurred');
  });
});
