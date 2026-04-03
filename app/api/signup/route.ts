import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSecureToken, sendUserVerificationEmail } from '@/lib/user-account';
import { logAuditEvent } from '@/lib/audit-log';

/**
 * Phase 3: Public User Signup Endpoint
 *
 * POST /api/signup
 * Body: { name, email, password }
 *
 * Creates a new user account with:
 * - Email validation (format + uniqueness)
 * - Strong password requirements
 * - Status = "pending_verification"
 * - Verification email sent automatically
 *
 * Response:
 * { success: true, message: "Verification email sent", user: { id, email, name } }
 *
 * Errors:
 * - Email already exists (409)
 * - Invalid email format (400)
 * - Weak password (400)
 * - Missing fields (400)
 */

// Password complexity validation (same as admin endpoint)
function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?\/]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&* etc)';
  }
  return null;
}

// Email validation regex
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    // Validate inputs
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Name must be between 2 and 100 characters' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password complexity
    const passwordError = validatePasswordComplexity(password);
    if (passwordError) {
      return NextResponse.json(
        { success: false, message: passwordError },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      // Phase 3: Log failed signup attempt
      await logAuditEvent('signup', 'user', {
        details: { email, reason: 'email_already_exists' },
        request,
      });

      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate verification token (24h expiry)
    const verificationToken = generateSecureToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'contributor',
        status: 'pending_verification',
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    // Send verification email
    try {
      await sendUserVerificationEmail(newUser.email, newUser.name, verificationToken);
    } catch (emailError) {
      console.warn('Failed to send verification email:', emailError);
      // Non-blocking: user created even if email fails
    }

    // Phase 3: Log successful signup
    await logAuditEvent('signup', 'user', {
      userId: newUser.id,
      details: { email, name },
      request,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created! Please check your email to verify your account.',
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: 'Signup endpoint. Use POST with name, email, password.',
    },
    { status: 200 }
  );
}
