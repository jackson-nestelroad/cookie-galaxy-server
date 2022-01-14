import {ObjectId} from 'mongodb';

/**
 * Service for creating and verifying authentication tokens.
 *
 * Used for request authentication.
 */
export interface AuthenticationServiceInterface {
  /**
   * Creates an authentication token to give to the user.
   * @param {ObjectId} id User ID.
   * @returns {string} New authentication token.
   */
  createToken(id: ObjectId): string;

  /**
   * Verifies an authentication token by giving the user ID associated.
   * @param {string} token Authentication token.
   * @returns {ObjectId} User ID. `null` if token is invalid.
   */
  verifyToken(token: string): ObjectId;
}
