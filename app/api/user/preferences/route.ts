import { NextRequest, NextResponse } from 'next/server';

interface UserPreference {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: 'ky' | 'en' | 'sw' | 'fr';
  savedArticles: string[];
  newsletters: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, theme, language, savedArticles, newsletters } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId is required',
        },
        { status: 400 }
      );
    }

    // Mock save (in real app, would save to database)
    const preference: UserPreference = {
      userId,
      theme: theme || 'system',
      language: language || 'ky',
      savedArticles: savedArticles || [],
      newsletters: newsletters || [],
    };

    return NextResponse.json(
      {
        success: true,
        data: preference,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save preferences',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId is required',
        },
        { status: 400 }
      );
    }

    // Mock fetch (in real app, would fetch from database)
    const preference: UserPreference = {
      userId,
      theme: 'system',
      language: 'ky',
      savedArticles: [],
      newsletters: [],
    };

    return NextResponse.json(
      {
        success: true,
        data: preference,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch preferences',
      },
      { status: 500 }
    );
  }
}
