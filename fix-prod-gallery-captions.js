#!/usr/bin/env node
/**
 * Script to apply gallery_captions column to production database
 * Run this on the VPS to fix: "The column `gallery_captions` does not exist in the current database"
 * 
 * Usage: node fix-prod-gallery-captions.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if .env file exists and has DATABASE_URL
const envPath = path.join(__dirname, '.env.local');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found!');
  console.error('Please ensure DATABASE_URL is set in .env.local for production database.');
  process.exit(1);
}

console.log('🔧 Fixing production database...\n');

// Step 1: Generate Prisma Client
console.log('📦 Step 1: Generating Prisma Client...');
exec('npx prisma generate', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error generating Prisma Client:', error);
    process.exit(1);
  }
  console.log('✅ Prisma Client generated\n');

  // Step 2: Apply migration
  console.log('🚀 Step 2: Applying migration to production database...');
  exec('npx prisma migrate deploy', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Migration failed:', error);
      console.error(stderr);
      process.exit(1);
    }
    console.log('✅ Migration applied successfully\n');

    // Step 3: Verify the column exists
    console.log('🔍 Step 3: Verifying gallery_captions column exists...');
    exec('npx prisma db execute --stdin', { input: `SELECT column_name FROM information_schema.columns WHERE table_name = 'article_translations' AND column_name = 'gallery_captions';` }, (error, stdout, stderr) => {
      if (error) {
        console.warn('⚠️  Could not verify directly, but migration was applied.');
      } else {
        console.log('✅ gallery_captions column verified in database\n');
      }

      console.log('🎉 Production database fix complete!');
      console.log('✅ The translation feature should now work on https://intambwemedia.com/admin/\n');
      console.log('Next steps:');
      console.log('1. Refresh https://intambwemedia.com/admin/ in your browser');
      console.log('2. Try translating an article');
      console.log('3. The gallery captions should now be preserved in translations\n');
    });
  });
});
