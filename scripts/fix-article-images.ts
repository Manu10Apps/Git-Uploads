import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import { getUploadsDir } from '@/lib/upload-config';

async function getUploadedImages(): Promise<string[]> {
  try {
    const uploadsDir = getUploadsDir();
    const files = await fs.readdir(uploadsDir);
    // Filter to only article uploads and sort them
    return files
      .filter((file) => file.startsWith('article-') && !file.includes('fallback'))
      .sort()
      .map((file) => `/uploads/${file}`);
  } catch (error) {
    console.error('Error reading uploads directory:', error);
    return [];
  }
}

async function fixArticleImages() {
  try {
    console.log('Starting article image fix...');

    // Get all articles with broken/external image URLs
    const articles = await prisma.article.findMany({
      where: {
        OR: [
          { image: null },
          { image: '' },
          { image: { contains: 'unsplash' } },
          { image: { contains: 'https://' } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${articles.length} articles to fix`);

    if (articles.length === 0) {
      console.log('No articles to fix');
      return;
    }

    // Get available uploaded images
    const uploadedImages = await getUploadedImages();
    console.log(`Found ${uploadedImages.length} uploaded images`);

    if (uploadedImages.length === 0) {
      console.log('No uploaded images available. Aborting.');
      return;
    }

    let updated = 0;
    let failed = 0;

    // Assign images to articles
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      // Cycle through available images
      const imageUrl = uploadedImages[i % uploadedImages.length];

      try {
        await prisma.article.update({
          where: { id: article.id },
          data: { image: imageUrl },
        });

        console.log(`✓ Article "${article.title}" → ${imageUrl}`);
        updated++;
      } catch (error) {
        console.error(`✗ Failed to update article "${article.title}":`, error);
        failed++;
      }
    }

    console.log(`\nFix completed: ${updated} updated, ${failed} failed`);
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixArticleImages()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
