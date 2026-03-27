import "dotenv/config";
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

async function main() {
  console.log('🔄 Resetting VPS admin credentials...');

  const adminEmail = 'admin@amakuru.news';
  const adminPassword = 'AdminPassword123!';
  const hashedPassword = await hashPassword(adminPassword);

  try {
    // Check if admin user exists
    const existing = await prisma.adminUser.findUnique({
      where: { email: adminEmail },
    });

    if (existing) {
      // Update existing admin
      const updated = await prisma.adminUser.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          name: 'IM Admin',
          role: 'admin',
        },
      });
      console.log('✅ Admin credentials updated:', updated.email);
    } else {
      // Create new admin
      const created = await prisma.adminUser.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'IM Admin',
          role: 'admin',
        },
      });
      console.log('✅ Admin user created:', created.email);
    }

    console.log('\n📋 Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n🔒 Test login at: https://intambwemedia.com/admin/login');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error resetting admin:', error);
    process.exit(1);
  }
}

main();
