# 🚀 Amakuru Installation & Setup Guide

## Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher (or yarn/pnpm)
- **Git**: For version control
- **VS Code**: Recommended editor

## Installation Steps

### Step 1: Navigate to Project
```bash
cd "d:\0) CODING\WEBSITES APPS\projects\Amakuru"
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all dependencies from `package.json`:
- Next.js 14.2.0
- React 18.3.1
- TypeScript 5.4.2
- Tailwind CSS 3.4.1
- And more...

### Step 3: Verify Installation
```bash
npm list
```

You should see all dependencies listed successfully.

### Step 4: Start Development Server
```bash
npm run dev
```

Output should show:
```
> amakuru@0.1.0 dev
> next dev

  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
```

### Step 5: Open in Browser
Navigate to: **http://localhost:3000**

You should see the Amakuru homepage!

## Available Scripts

### Development
```bash
npm run dev
```
Runs Next.js dev server with hot reload on port 3000

### Production Build
```bash
npm run build
```
Creates optimized production build in `.next` folder

### Production Start
```bash
npm run start
```
Starts production server (run after `npm run build`)

### Linting
```bash
npm run lint
```
Runs ESLint to check code quality

### Storybook (Component Development)
```bash
npm run storybook
```
Opens Storybook on http://localhost:6006

### Build Storybook
```bash
npm run build-storybook
```
Creates static Storybook build

## Environment Setup

### Create .env.local
```bash
# Create file: .env.local
echo "# Environment variables" > .env.local
```

Add these variables (optional):
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Analytics (optional)
NEXT_PUBLIC_GA_ID=

# Third-party Services (add as needed)
NEXT_PUBLIC_STRIPE_KEY=
```

**Note**: All `NEXT_PUBLIC_*` variables are exposed to browser

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android latest

## IDE Setup (VS Code)

### Recommended Extensions
1. **ES7+ React/Redux/React-Native snippets**
   - ID: `dsznajder.es7-react-js-snippets`

2. **Prettier - Code formatter**
   - ID: `esbenp.prettier-vscode`

3. **ESLint**
   - ID: `dbaeumer.vscode-eslint`

4. **TypeScript Vue Plugin (Volar)**
   - ID: `vue.vscode-typescript-vue-plugin`

5. **Tailwind CSS IntelliSense**
   - ID: `bradlc.vscode-tailwindcss`

### Settings (.vscode/settings.json)
Create `.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## Project Configuration

### TypeScript (tsconfig.json)
- Strict mode enabled
- Path aliases configured (`@/*`)
- ES2020 target
- DOM libraries included

### Tailwind (tailwind.config.js)
- Custom color palette
- Dark mode with class strategy
- Custom animations
- Glassmorphism utilities

### Next.js (next.config.js)
- i18n locales: ky, en, sw, fr
- Image optimization
- Security headers
- Locale detection

## Troubleshooting

### Port 3000 Already in Use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3001
```

### Dependencies Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -r node_modules
rm package-lock.json

# Reinstall
npm install
```

### Build Fails
```bash
# Check TypeScript errors
npx tsc --noEmit

# Check Next.js build
npm run build

# View detailed error
npm run build -- --debug
```

### Hot Reload Not Working
- Clear browser cache (Ctrl+Shift+Delete)
- Restart dev server
- Check for syntax errors in modified files

### Dark Mode Not Appearing
- Clear browser cache
- Check if HTML has `dark` class
- Verify CSS is loaded in DevTools

## Development Workflow

### Daily Development
1. Start dev server: `npm run dev`
2. Make code changes
3. Test in browser (auto-reload)
4. Commit changes: `git add .` → `git commit -m "message"`

### Before Pushing
1. Run linter: `npm run lint`
2. Build project: `npm run build`
3. Test production build: `npm run start`

### Deployment
1. Build: `npm run build`
2. Deploy `.next` folder + `public` folder
3. Set environment variables on server
4. Restart Node.js process

## File Structure Overview

```
Amakuru/
├── app/                    # Next.js app router
├── lib/                    # Utilities & config
├── styles/                 # Global CSS
├── public/                 # Static files
├── node_modules/          # Dependencies (after npm install)
├── .next/                 # Build output (after npm run build)
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies & scripts
├── tsconfig.json          # TypeScript config
├── tailwind.config.js     # Tailwind config
├── postcss.config.js      # PostCSS config
├── next.config.js         # Next.js config
└── .env.local            # Environment variables (create manually)
```

## Documentation Files

- **README.md** - Full technical documentation
- **DEVELOPMENT.md** - Developer guide & code patterns
- **QUICKSTART.md** - Quick start guide
- **CHECKLIST.md** - Build checklist
- **BUILD_STATUS.md** - Project completion status
- **AMAKURU_NEWS_WEBSITE_DESIGN.md** - Editorial guidelines
- **INSTALLATION.md** - This file

## Performance Tips

1. **Use Chrome DevTools**
   - Network tab: Check loading times
   - Performance tab: Profile builds
   - Lighthouse: Run audits

2. **Next.js Optimizations**
   - Image component for images
   - Dynamic imports for large components
   - Link prefetching for navigation

3. **Development Mode**
   - TypeScript checking: On compile
   - ESLint: On save
   - Faster builds than production

## Next Steps After Installation

1. ✅ Install dependencies (`npm install`)
2. ✅ Start dev server (`npm run dev`)
3. ✅ Explore homepage (http://localhost:3000)
4. ✅ Check article page (click on article)
5. ✅ Test dark mode toggle (button in header)
6. ✅ Test language switching (footer languages)
7. ✅ Review code in `app/` directory
8. ✅ Read `DEVELOPMENT.md` for coding patterns

## Getting Help

### Common Resources
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Project Documentation
- Technical: `README.md`
- Development: `DEVELOPMENT.md`
- Design: `AMAKURU_NEWS_WEBSITE_DESIGN.md`

### Debug Steps
1. Check browser console for errors
2. Check terminal for build errors
3. Verify all dependencies installed
4. Clear cache and restart dev server
5. Check TypeScript errors: `npx tsc --noEmit`

## System Requirements

### Minimum
- **RAM**: 4GB
- **Disk**: 1GB free
- **CPU**: 2-core processor

### Recommended
- **RAM**: 8GB+
- **Disk**: 5GB free
- **CPU**: 4-core processor
- **Network**: Stable internet for npm packages

## Operating System Support

| OS | Support | Notes |
|----|---------|-------|
| Windows 10/11 | ✅ | Use PowerShell or WSL |
| macOS 10.15+ | ✅ | Native support |
| Linux | ✅ | Most distributions |
| Windows 7 | ⚠️ | Node 18 may not support |

## First Time Setup Checklist

- [ ] Node.js installed (18.0+)
- [ ] Navigate to correct folder
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] See homepage loaded
- [ ] Test dark mode toggle
- [ ] Test language switching
- [ ] Review DEVELOPMENT.md
- [ ] Start developing!

## Completion Status

Once you see the homepage with:
- ✅ Header with logo
- ✅ Featured articles grid
- ✅ Breaking news banner
- ✅ Newsletter signup section
- ✅ Footer with languages

**Installation is complete!** 🎉

---

**Happy coding with Amakuru!** 🚀

For issues or questions, check the documentation files or review the code structure.
