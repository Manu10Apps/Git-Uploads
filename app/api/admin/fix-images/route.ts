import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { prisma } from '@/lib/prisma';
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

export async function POST(request: NextRequest) {
  try {
    console.log('Starting article image fix...');

    // Get all articles with broken/external image URLs
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${articles.length} articles`);

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles found',
        updated: 0,
        failed: 0,
      });
    }

    // Get available uploaded images
    const uploadedImages = await getUploadedImages();
    console.log(`Found ${uploadedImages.length} uploaded images`);

    if (uploadedImages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No uploaded images available',
      });
    }

    let updated = 0;
    let failed = 0;
    const updates: Array<{ id: number; title: string; oldImage: string | null; newImage: string }> = [];

    // Assign images to articles
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      // Cycle through available images
      const imageUrl = uploadedImages[i % uploadedImages.length];

      // Skip if image is already a local upload
      if (article.image && article.image.startsWith('/uploads/')) {
        continue;
      }

      try {
        await prisma.article.update({
          where: { id: article.id },
          data: { image: imageUrl },
        });

        updates.push({
          id: article.id,
          title: article.title,
          oldImage: article.image,
          newImage: imageUrl,
        });
        updated++;
      } catch (error) {
        console.error(`Failed to update article id ${article.id}:`, error);
        failed++;
      }
    }

    console.log(`Fix completed: ${updated} updated, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updated} articles`,
      updated,
      failed,
      updates: updates.slice(0, 10), // Return first 10 for preview
    });
  } catch (error) {
    console.error('Error during fix:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fix images',
      },
      { status: 500 }
    );
  }
}
