import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Phase 2: Reduced JWT expiry (from 7d to 4h)
export function generateToken(adminId: number): string {
  return jwt.sign({ adminId }, process.env.JWT_SECRET!, {
    expiresIn: '4h',  // Changed from '7d' to 4 hours
  });
}

// Phase 2: Generate refresh token (random 32-byte hex string)
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function verifyToken(token: string): { adminId: number } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { adminId: number };
  } catch (error) {
    return null;
  }
}

// Phase 2: Verify JWT payload (for refresh endpoint)
export function verifyTokenPayload(token: string): { adminId: number } | null {
  return verifyToken(token);
}
