require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkArticleImages() {
  try {
    const articles = await prisma.article.findMany({
      where: { image: { not: null } },
      select: {
        id: true,
        slug: true,
        title: true,
        image: true,
      },
      orderBy: { id: 'desc' },
      take: 5,
    });

    console.log('=== Recent Articles with Images ===\n');
    articles.forEach((article, index) => {
      console.log(`${index + 1}. ID: ${article.id}`);
      console.log(`   Slug: ${article.slug}`);
      console.log(`   Title: ${article.title}`);
      console.log(`   Image Path: ${article.image}`);
      console.log(`   Absolute URL: https://intambwemedia.com${article.image?.startsWith('/') ? '' : '/'}${article.image}`);
      console.log();
    });

    // Check if any images are URLs vs paths
    const urlImages = articles.filter(a => /^https?:\/\//.test(a.image || ''));
    const pathImages = articles.filter(a => !/^https?:\/\//.test(a.image || ''));

    console.log(`\n=== Summary ===`);
    console.log(`Total articles checked: ${articles.length}`);
    console.log(`Stored as URLs: ${urlImages.length}`);
    console.log(`Stored as paths: ${pathImages.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkArticleImages();
