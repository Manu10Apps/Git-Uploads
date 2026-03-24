# Amakuru Development Guide

## Quick Start

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
npm run start
```

## Project Structure

### `/app` - Next.js App Router
- `page.tsx` - Homepage
- `layout.tsx` - Root layout wrapper
- `components/` - Reusable React components
- `api/` - Backend API routes
- `styles/` - Global stylesheets
- `article/[slug]/` - Dynamic article pages
- `category/[category]/` - Dynamic category pages

### `/lib` - Utilities & Configuration
- `translations.ts` - Multi-language strings (Kinyarwanda, English, Swahili, French)
- `store.ts` - Zustand state management
- `utils.ts` - Helper functions

### `/styles` - Global Styles
- `globals.css` - Reset, typography, utilities, dark mode

### `/public` - Static Assets
- Images, icons, favicons

## Key Technologies

| Technology | Purpose | Version |
|-----------|---------|---------|
| Next.js | Full-stack React framework | 14.2.0 |
| React | UI library | 18.3.1 |
| TypeScript | Type safety | 5.4.2 |
| Tailwind CSS | Utility-first CSS | 3.4.1 |
| Zustand | State management | 4.4.7 |
| Lucide React | Icon library | 0.370.0 |

## Code Patterns

### Component Structure
```tsx
'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export function MyComponent() {
  const { language } = useAppStore();
  const t = getTranslation(language);

  return (
    <div className="p-4">
      {t.nav.home}
    </div>
  );
}
```

### Using Translations
```tsx
const { language } = useAppStore();
const t = getTranslation(language);

// Access translations
console.log(t.nav.home);        // 'Aho' in Kinyarwanda
console.log(t.article.readTime); // 'min read' in English
```

### Styling Patterns

**Responsive Design:**
```tsx
<div className="px-4 sm:px-6 lg:px-8">
  // Mobile: 16px padding, tablet: 24px, desktop: 32px
</div>
```

**Dark Mode:**
```tsx
<div className="bg-white dark:bg-neutral-950">
  // White on light, dark gray on dark mode
</div>
```

**Conditional Classes:**
```tsx
import { cn } from '@/lib/utils';

<button className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-primary-600 text-white',
  !isActive && 'bg-gray-100'
)}>
  Click me
</button>
```

## Adding New Features

### Adding a New Page
1. Create file in `/app/page-name/page.tsx`
2. Import `Header` and `Footer` components
3. Use translations for text content
4. Style with Tailwind classes

Example:
```tsx
// app/breaking/page.tsx
'use client';

import { Header, Footer } from '@/app/components';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

export default function BreakingPage() {
  const { language } = useAppStore();
  const t = getTranslation(language);

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Page content */}
      </main>
      <Footer />
    </>
  );
}
```

### Adding a New Component
1. Create file in `/app/components/ComponentName.tsx`
2. Use TypeScript interfaces for props
3. Add to `/app/components/index.ts` exports

Example:
```tsx
// app/components/Alert.tsx
'use client';

interface AlertProps {
  type: 'success' | 'error' | 'warning';
  message: string;
}

export function Alert({ type, message }: AlertProps) {
  const colors = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className={`p-4 rounded ${colors[type]}`}>
      {message}
    </div>
  );
}
```

### Adding a New Translation
1. Edit `lib/translations.ts`
2. Add text to all language objects (ky, en, sw, fr)
3. Use in components: `t.section.key`

Example:
```tsx
// In translations.ts
export const ky = {
  nav: {
    home: 'Aho',
    newKey: 'Ijambo Ryishya',
  },
};

// In component
const t = getTranslation(language);
console.log(t.nav.newKey); // 'Ijambo Ryishya'
```

### Adding an API Route
1. Create file in `/app/api/endpoint/route.ts`
2. Handle GET/POST/PUT/DELETE requests
3. Return JSON responses

Example:
```tsx
// app/api/articles/featured/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const articles = [
      // Your data here
    ];

    return NextResponse.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

## Styling Guidelines

### Color System
```tsx
// Primary
bg-primary-50   // Lightest
bg-primary-500  // Main
bg-primary-900  // Darkest

// Dark mode
dark:bg-primary-900
dark:text-primary-50
```

### Spacing
- Use Tailwind scale: p-0, p-1, p-2, p-4, p-6, p-8...
- 1 unit = 4px

### Typography
```tsx
// Headings
<h1 className="text-4xl md:text-5xl font-bold">
<h2 className="text-3xl md:text-4xl font-bold">

// Body
<p className="text-base text-neutral-600 dark:text-neutral-400">
```

## Performance Tips

1. **Image Optimization**: Use Next.js Image component
2. **Code Splitting**: Automatic with Next.js
3. **Lazy Loading**: Use dynamic imports for heavy components
4. **Caching**: Leverage Next.js caching strategies

## SEO Best Practices

1. Update `metadata` in layout files
2. Use semantic HTML (h1, h2, article, section)
3. Add alt text to images
4. Use descriptive link text
5. Implement schema.org markup

## Accessibility Checklist

- [ ] All images have descriptive alt text
- [ ] Color contrast meets WCAG AA (7:1)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus states are visible
- [ ] Form inputs have labels
- [ ] Headings follow hierarchy (h1 > h2 > h3)
- [ ] Language specified in HTML tag

## Testing (Future Implementation)

Recommended tools:
- Jest for unit testing
- React Testing Library for component testing
- Playwright for e2e testing

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy automatically on push

### Self-hosted
1. Build: `npm run build`
2. Start: `npm run start`
3. Use PM2/Docker for process management

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Debugging

### Browser DevTools
- React Developer Tools extension
- Network tab for API calls
- Console for errors
- Sources for breakpoints

### VS Code
- Install "ES7+ React/Redux/React-Native snippets"
- Use built-in debugger

## Common Issues

### Dark mode not working
- Clear browser cache
- Check if `<html>` has `dark` class
- Verify `ThemeProvider` is in layout

### Translations not updating
- Ensure language is changed via `setLanguage()`
- Check spelling in translations.ts
- Verify component uses `useAppStore()`

### API not working
- Check console for CORS errors
- Verify route file path
- Test with curl or Postman

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand](https://github.com/pmndrs/zustand)

## Getting Help

1. Check existing components for patterns
2. Review Next.js documentation
3. Search GitHub issues
4. Ask in team chat/PR reviews

---

Happy coding! 🚀
