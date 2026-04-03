import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { generateSecureToken, sendAdminVerificationEmail } from '@/lib/admin-account';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { email, password, name = 'Admin', role = 'admin' } = body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const primaryAdminEmail = String(
      process.env.ADMIN_EMAIL || 'ndahayemmanuel@gmail.com'
    ).trim().toLowerCase();
    const autoVerifyPrimaryAdmin = normalizedEmail === primaryAdminEmail;

    // Validate inputs
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const validRoles = ['admin', 'sub-admin', 'editor'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Role must be admin, sub-admin, or editor' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Check if user already exists
    const existingUser = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Update existing user
      const verificationToken = autoVerifyPrimaryAdmin ? null : generateSecureToken();
      const verificationExpires = autoVerifyPrimaryAdmin
        ? null
        : new Date(Date.now() + 1000 * 60 * 60 * 24);

      const updatedUser = await prisma.adminUser.update({
        where: { email: normalizedEmail },
        data: {
          password: hashedPassword,
          name,
          role,
          emailVerified: autoVerifyPrimaryAdmin,
          emailVerificationToken: verificationToken,
          emailVerificationExpiresAt: verificationExpires,
        },
      });

      if (verificationToken) {
        await sendAdminVerificationEmail(updatedUser.email, updatedUser.name, verificationToken);
      }

      return NextResponse.json(
        {
          success: true,
          message: autoVerifyPrimaryAdmin
            ? 'Primary admin updated and verified successfully.'
            : 'Admin user updated successfully. Verification link sent to email.',
          user: {
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
          },
        },
        { status: 200 }
      );
    }

    // Create new user
    const verificationToken = autoVerifyPrimaryAdmin ? null : generateSecureToken();
    const verificationExpires = autoVerifyPrimaryAdmin
      ? null
      : new Date(Date.now() + 1000 * 60 * 60 * 24);

    const newUser = await prisma.adminUser.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        role,
        emailVerified: autoVerifyPrimaryAdmin,
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpires,
      },
    });

    if (verificationToken) {
      await sendAdminVerificationEmail(newUser.email, newUser.name, verificationToken);
    }

    return NextResponse.json(
      {
        success: true,
        message: autoVerifyPrimaryAdmin
          ? 'Primary admin created and verified successfully.'
          : 'Admin user created successfully. Verification link sent to email.',
        user: {
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create admin user',
      },
      { status: 500 }
    );
  }
}
