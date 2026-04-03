import "dotenv/config";
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

async function addAdminUser() {
  try {
    const email = 'admin@amakuru.news';
    const password = 'AdminPassword123!';
    const name = 'Amakuru Admin';

    // Check if user already exists
    const existing = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('❌ User already exists:', email);
      return;
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create new admin user
    const admin = await prisma.adminUser.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
      emailVerified: true,
    },
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.name);
    console.log('🔐 Role:', admin.role);
    console.log('---');
    console.log('You can now login with these credentials at: https://intambwemedia.com/admin/login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

addAdminUser();
