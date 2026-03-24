import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NAV_CATEGORY_ITEMS } from '@/lib/nav-categories';

const CATEGORY_NAME_BY_SLUG: Record<string, string> = {
  amakuru: 'Amakuru',
  politiki: 'Politiki',
  ubuzima: 'Ubuzima',
  uburezi: 'Uburezi',
  ubukungu: 'Ubukungu',
  siporo: 'Siporo',
  ikoranabuhanga: 'Ikoranabuhanga',
  imyidagaduro: 'Imyidagaduro',
  ubutabera: 'Ubutabera',
  ibidukikije: 'Ibidukikije',
  imyemerere: 'Imyemerere',
  'afurika-yiburasirazuba': "Afrika y'Iburasirazuba",
  'mu-mahanga': 'Mu Mahanga',
};

const CANONICAL_WEBSITE_CATEGORIES = NAV_CATEGORY_ITEMS
  .map((item) => item.slug)
  .filter((slug): slug is string => Boolean(slug))
  .filter((slug, index, arr) => arr.indexOf(slug) === index)
  .map((slug) => ({
    slug,
    name:
      CATEGORY_NAME_BY_SLUG[slug] ||
      slug
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
  }));

const CANONICAL_WEBSITE_CATEGORY_SLUGS = CANONICAL_WEBSITE_CATEGORIES.map((category) => category.slug);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get('includeAll') === 'true';

  try {
    // Admin needs all website categories to always be available in dropdowns.
    if (includeAll) {
      await Promise.all(
        CANONICAL_WEBSITE_CATEGORIES.map((category) =>
          prisma.category.upsert({
            where: { slug: category.slug },
            update: {
              name: category.name,
              status: 'active',
            },
            create: {
              name: category.name,
              slug: category.slug,
              status: 'active',
            },
          })
        )
      );
    }

    const categories = await prisma.category.findMany({
      where: includeAll
        ? { slug: { in: CANONICAL_WEBSITE_CATEGORY_SLUGS } }
        : {
            status: 'active',
            slug: { in: CANONICAL_WEBSITE_CATEGORY_SLUGS },
          },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);

    const fallbackCategories = CANONICAL_WEBSITE_CATEGORIES.map((category, index) => ({
      id: index + 1,
      name: category.name,
      slug: category.slug,
      description: null,
      status: 'active',
    }));

    return NextResponse.json(
      {
        success: true,
        data: includeAll ? fallbackCategories : fallbackCategories.filter((c) => c.status === 'active'),
        degraded: true,
        message: 'Database unavailable, returned fallback categories.',
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, slug, description, parentId } = await request.json();

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Name and slug required' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        parentId: parentId || null,
        status: 'active',
      },
    });

    return NextResponse.json(
      { success: true, data: category },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Category name or slug already exists' },
        { status: 409 }
      );
    }

    console.error('Failed to create category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
