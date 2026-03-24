import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(adminId: number): string {
  return jwt.sign({ adminId }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): { adminId: number } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { adminId: number };
  } catch (error) {
    return null;
  }
}
