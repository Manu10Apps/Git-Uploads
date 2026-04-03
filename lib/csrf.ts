import crypto from 'node:crypto';

/**
 * Phase 2: CSRF Token Management
 *
 * CSRF (Cross-Site Request Forgery) tokens prevent unauthorized form submissions
 * from other sites. This is a simple implementation:
 *
 * 1. Generate token: sent to client on page load
 * 2. Client includes token in form submission headers (X-CSRF-Token)
 * 3. Server validates token matches session
 *
 * Note: This uses session-less validation via HMAC-signed tokens.
 */

const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';

/**
 * Generate a CSRF token using HMAC
 * Token is computed as HMAC(secret, sessionId) so it's deterministic per session
 * but cannot be forged without knowing the secret
 */
export function generateCSRFToken(sessionId: string): string {
  return crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(sessionId)
    .digest('hex');
}

/**
 * Verify a CSRF token against a session ID
 * Returns true if token is valid, false otherwise
 */
export function verifyCSRFToken(token: string, sessionId: string): boolean {
  try {
    const expectedToken = generateCSRFToken(sessionId);
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch {
    return false;
  }
}

/**
 * Extract CSRF token from request headers
 * Convention: X-CSRF-Token header
 */
export function extractCSRFToken(headers: Headers): string | null {
  return headers.get('x-csrf-token') || null;
}

/**
 * Generate a session ID (can be any unique identifier)
 * In production, this would be the user's session/JWT
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}
