# Amakuru Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  Chrome, Firefox, Safari, Mobile Browsers                         │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ HTTP(S)
                ┌──────────────────┴──────────────────┐
                │                                     │
        ┌───────▼────────┐              ┌────────────▼────────┐
        │   Static CDN   │              │   Next.js Server    │
        │  (Images, CSS) │              │   (Port 3000)       │
        └────────────────┘              └──────────┬──────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
            ┌───────▼──────────┐         ┌────────▼────────┐         ┌──────────▼────┐
            │   React Pages    │         │  API Routes     │         │  Components   │
            │  - Homepage      │         │  - /articles    │         │  - Header     │
            │  - Article       │         │  - /search      │         │  - Footer     │
            │  - Category      │         │  - /preferences │         │  - NewsCard   │
            │  - Layout        │         │                 │         │  - FactCheck  │
            └──────────────────┘         └─────────────────┘         └───────────────┘
                    │                              │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │     Zustand Store            │
                    │  - Theme (light/dark)        │
                    │  - Language (ky/en/sw/fr)    │
                    │  - User Preferences          │
                    │  - Article State             │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────────────┐
                    │     Library & Utilities               │
                    │  - Translations (4 languages)         │
                    │  - Helper Functions                   │
                    │  - Date/Text Utilities                │
                    └──────────────┬───────────────────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                │                                     │
        ┌───────▼──────────┐              ┌─────────▼───────┐
        │  Styling Layer   │              │  Type System    │
        │  - Tailwind CSS  │              │  - TypeScript   │
        │  - Dark Mode     │              │  - Type Safety  │
        │  - Responsive    │              │  - Interfaces   │
        └──────────────────┘              └─────────────────┘
```

## Frontend Architecture

```
App (React)
│
├── RootLayout
│   ├── Metadata (SEO)
│   ├── ThemeProvider (Dark Mode)
│   └── Routes
│       │
│       ├── / (HomePage)
│       │   ├── Header
│       │   ├── Hero Section
│       │   ├── NewsGrid
│       │   │   └── NewsCard (×6)
│       │   ├── Newsletter Section
│       │   └── Footer
│       │
│       ├── /article/[slug]
│       │   ├── Header
│       │   ├── Article Header
│       │   │   ├── Title
│       │   │   ├── Author Info
│       │   │   └── Metadata
│       │   ├── Article Content
│       │   ├── FactCheckBox
│       │   ├── Sources Section
│       │   ├── Related Articles
│       │   ├── Comments Section
│       │   └── Footer
│       │
│       ├── /category/[category]
│       │   ├── Header
│       │   ├── Category Header
│       │   ├── Filters & Sorting
│       │   ├── NewsGrid
│       │   │   └── NewsCard (×N)
│       │   ├── Pagination
│       │   └── Footer
│       │
│       └── Other Routes (Breaking, etc.)
```

## Component Architecture

```
┌─────────────────────────────────────────┐
│         Component Library               │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Header Component                 │  │
│  │  ├── Logo                         │  │
│  │  ├── Navigation Menu              │  │
│  │  ├── Search Button                │  │
│  │  ├── Theme Toggle                 │  │
│  │  └── Mobile Hamburger             │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  NewsCard Component               │  │
│  │  ├── Image Container              │  │
│  │  ├── Category Badge               │  │
│  │  ├── Title                        │  │
│  │  ├── Excerpt                      │  │
│  │  ├── Metadata                     │  │
│  │  └── Action Buttons               │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  FactCheckBox Component           │  │
│  │  ├── Claim Text                   │  │
│  │  ├── Status Badge                 │  │
│  │  └── Sources List                 │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Footer Component                 │  │
│  │  ├── Brand Section                │  │
│  │  ├── Links Columns                │  │
│  │  ├── Language Selector            │  │
│  │  └── Social Links                 │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## Data Flow Diagram

```
                    User Interaction
                           │
                    ┌──────▼──────┐
                    │   Component  │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        ┌─────▼──────┐           ┌─────▼──────┐
        │ Zustand    │           │ API Route  │
        │ Store      │           │            │
        └─────┬──────┘           └─────┬──────┘
              │                         │
        ┌─────▼──────┐           ┌─────▼──────┐
        │ Local      │           │ Backend    │
        │ Storage    │           │ (Future)   │
        └────────────┘           └────────────┘

        Component → Store → Re-render → Update UI
```

## Technology Stack Layers

```
┌──────────────────────────────────────────────┐
│         Presentation Layer                    │
│  ┌─────────────────────────────────────────┐ │
│  │  React Components (TSX)                 │ │
│  │  - Pages, Components                    │ │
│  │  - Interactive UI                       │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
         │
┌──────────────────────────────────────────────┐
│         Styling Layer                         │
│  ┌─────────────────────────────────────────┐ │
│  │  Tailwind CSS + Global CSS              │ │
│  │  - Responsive Design                    │ │
│  │  - Dark Mode                            │ │
│  │  - Animations                           │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
         │
┌──────────────────────────────────────────────┐
│         State Management Layer                │
│  ┌─────────────────────────────────────────┐ │
│  │  Zustand Store                          │ │
│  │  - Theme, Language, User State          │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
         │
┌──────────────────────────────────────────────┐
│         Routing & Framework Layer             │
│  ┌─────────────────────────────────────────┐ │
│  │  Next.js 14 + React 18                  │ │
│  │  - App Router                           │ │
│  │  - API Routes                           │ │
│  │  - Server-side Rendering                │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
         │
┌──────────────────────────────────────────────┐
│         Type Safety Layer                     │
│  ┌─────────────────────────────────────────┐ │
│  │  TypeScript                             │ │
│  │  - Compile-time Type Checking           │ │
│  │  - Interface Definitions                │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

## Internationalization (i18n) Flow

```
User selects language
        │
        ▼
┌─────────────────────┐
│  setLanguage(lang)  │ (Zustand)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Get Translation Object         │
│  t = getTranslation(language)   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Component Re-renders with      │
│  new translations               │
└─────────────────────────────────┘

Supported Languages:
├── Kinyarwanda (ky) - Primary
├── English (en)
├── Swahili (sw)
└── French (fr)
```

## Dark Mode Implementation

```
System Detects Preference
        │
        ├─ Light Mode Preference
        │       │
        │       ▼
        │  Document class: '' (none)
        │
        ├─ Dark Mode Preference
        │       │
        │       ▼
        │  Document class: 'dark'
        │
        └─ User Override
                │
                ▼
        Zustand Store: theme
                │
                ▼
        Apply CSS with dark: prefix
```

## API Routes Architecture

```
┌────────────────────────────────────────┐
│      API Routes (/api)                 │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  /articles                       │ │
│  │  GET: Fetch articles             │ │
│  │  Query: category, limit, offset  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  /search                         │ │
│  │  GET: Search articles            │ │
│  │  Query: q, lang                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  /user/preferences               │ │
│  │  GET: Get user settings          │ │
│  │  POST: Save user settings        │ │
│  │  Body: theme, language, prefs    │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

## File Organization

```
Amakuru/
│
├── app/
│   ├── components/        (Reusable Components)
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── NewsCard.tsx
│   │   ├── FactCheckBox.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── index.ts
│   │
│   ├── api/               (Backend API Routes)
│   │   ├── articles/
│   │   ├── search/
│   │   └── user/preferences/
│   │
│   ├── article/[slug]/    (Dynamic Article Pages)
│   ├── category/[category]/ (Dynamic Category Pages)
│   ├── styles/            (Global CSS)
│   ├── layout.tsx         (Root Layout)
│   └── page.tsx           (Homepage)
│
├── lib/                   (Utilities & Config)
│   ├── translations.ts    (i18n)
│   ├── store.ts          (State Management)
│   └── utils.ts          (Helpers)
│
├── public/               (Static Assets)
├── styles/              (Global Styles)
│
├── Configuration Files
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── next.config.js
│   └── .gitignore
│
└── Documentation
    ├── README.md
    ├── DEVELOPMENT.md
    ├── INSTALLATION.md
    ├── QUICKSTART.md
    ├── CHECKLIST.md
    ├── BUILD_STATUS.md
    └── AMAKURU_NEWS_WEBSITE_DESIGN.md
```

## Deployment Architecture (Future)

```
┌─────────────────────────────────────────────────────┐
│                 CDN (Cloudflare)                     │
│           (Images, CSS, Static Assets)               │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│            Next.js Application Server                │
│  ┌────────────────────────────────────────────────┐ │
│  │  Vercel (Recommended) or AWS/Google Cloud     │ │
│  │  - Auto-scaling                               │ │
│  │  - Global edge network                        │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│            Database (PostgreSQL)                     │
│  - Article content                                   │
│  - User preferences                                  │
│  - Comments, bookmarks                              │
└──────────────────────────────────────────────────────┘
```

---

**This architecture supports**:
- ✅ 4-language support (i18n)
- ✅ Dark/light modes
- ✅ Responsive design
- ✅ Type-safe development
- ✅ Component reusability
- ✅ API extensibility
- ✅ Scalable growth
- ✅ Production deployment

**Ready for**: Database integration, authentication, advanced features, and scaling!
