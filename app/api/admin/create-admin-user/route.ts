import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { email, password, name = 'Admin', role = 'admin' } = body;

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Check if user already exists
    const existingUser = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // Update existing user
      const updatedUser = await prisma.adminUser.update({
        where: { email: email.toLowerCase() },
        data: {
          password: hashedPassword,
          name,
          role,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Admin user updated successfully',
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
    const newUser = await prisma.adminUser.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Admin user created successfully',
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
