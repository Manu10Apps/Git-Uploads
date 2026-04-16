# Translation Service Diagnostic & Fix Guide

## Current Status

- ✅ Database: Column `gallery_captions` added successfully
- ✅ Code: Deployed with improved retry logic and better error handling
- ❌ Services: All experiencing issues on production

## Known Issues

### 1. **LibreTranslate: HTTP 400 + 429 Errors**

- **400 Error**: Indicates unsupported language code or bad request
  - Likely: Kinyarwanda ('rw' code) not supported by public instances
  - Solution: Either skip Kinyarwanda or use 'en' fallback
- **429 Error**: Rate limited
  - Solution: Improved with exponential backoff (waits: 1s, 2s, 4s, 8s)

### 2. **Puter: WebSocket Connection Failures**

- **Error**: `WebSocket connection to 'wss://api.puter.com/socket.io' failed`
- **Causes**:
  - Service unavailable/down
  - VPS IP blocked by Puter
  - Network firewall restrictions on VPS
- **Solution**: Added retry logic with 3-4 attempts + exponential backoff

### 3. **MyMemory: HTTP 429 Rate Limiting**

- **Error**: Rate limited on repeated requests
- **Solution**: Improved with aggressive backoff (2s, 4s, 8s, 16s, 32s waits)

## Testing Tools

### 1. Health Check Endpoint

```
GET /api/translations/health
```

- Tests each service from production environment
- Shows which services are reachable
- Check at: `https://intambwemedia.com/api/translations/health`

### 2. Diagnostic Script

```bash
npx ts-node diagnose-translations.ts
```

- Comprehensive test of all translation services
- Tests Kinyarwanda support specifically
- Run from workspace root

## Recommended Fixes

### Short-term (Immediate)

1. **Test health endpoint** to see which services are available
2. **Monitor logs** at `https://intambwemedia.com/admin/` to see error messages
3. **Wait 2-3 hours** - services might be temporarily rate limited
4. **Try different times** - less traffic = fewer rate limits

### Medium-term (1-2 days)

1. **Implement Kinyarwanda fallback**:

   ```typescript
   // If source/target is Kinyarwanda and all services fail,
   // return original text instead of error
   if (hasKinyarwanda && allServicesFailed) {
     return originalContent; // Don't translate
   }
   ```

2. **Add persistent translation cache**:
   - Use database to cache translations
   - Reduces repeated API calls
   - Helps with rate limiting

3. **Find additional endpoints**:
   - Test private LibreTranslate instances
   - Look for alternative free translation APIs

### Long-term (1+ weeks)

1. **Host own LibreTranslate instance** with Kinyarwanda support
2. **Migrate to Google Translate API** (paid, but reliable)
3. **Build custom ML model** for Kinyarwanda

## What Changed in Latest Deploy

### LibreTranslate Service (`lib/libretranslate-server.ts`)

- ✅ Added 4th endpoint for fallback
- ✅ Distinguishes 400 (unsupported lang) from 429 (rate limit)
- ✅ Exponential backoff: 1s, 2s, 4s, 8s waits
- ✅ Better error logging with request/response details
- ✅ Skips retry loop on 400 (bad request)

### MyMemory Service (`lib/mymemory-translate.ts`)

- ✅ Increased max retries from default to 5
- ✅ Added 429 rate-limit detection
- ✅ Aggressive exponential backoff: 2s, 4s, 8s, 16s, 32s
- ✅ Better error messages

### Puter Service (`lib/puter-server-translate.ts`)

- ✅ Added retry loop with 3 attempts
- ✅ 429 rate-limit handling
- ✅ Exponential backoff: 1s, 2s, 4s
- ✅ Better error tracking

### Translation Route (`app/api/translations/translate-article/route.ts`)

- ✅ Kinyarwanda detection logging
- ✅ Better error messages

### Health Check Endpoint (NEW)

- ✅ `GET /api/translations/health`
- ✅ Tests all services from production
- ✅ Returns status of each endpoint

## Known Limitations

### Kinyarwanda Support

Many free translation services **do not support Kinyarwanda** ('rw code):

- Google Translate (free API deprecated)
- LibreTranslate public instances (limited language support)
- MyMemory (community-driven, might not have Kinyarwanda)
- Puter (general-purpose AI, not focused on African languages)

**Workaround**: Skip translation for Kinyarwanda ↔ other languages

## Database Column Status

✅ **VERIFIED** - Column exists in production database:

```sql
gallery_captions | TEXT type
```

Verified with:

```bash
docker exec vps-intambwe-news-web-app-database-cwd4a1.1.6biwmpfrhiwx5mtuns9fuk9zt psql \
  -U app_user -d app_db \
  -c "SELECT column_name, data_type FROM information_schema.columns \
      WHERE table_name = 'article_translations' AND column_name = 'gallery_captions';"
```

Result:

```
  column_name    | data_type
------------------+-----------
 gallery_captions | text
(1 row)
```

## Next Steps

1. **Check health**: `GET /api/translations/health`
2. **Monitor errors**: Check browser console for detailed error messages
3. **Wait & Retry**: Rate limits usually clear after 30-60 minutes
4. **Report findings**: Share health endpoint output and error messages

## Contact Information

For additional help:

- Check VPS logs: `docker logs [container-name]`
- Test local dev: `npm run dev` on http://localhost:3000
- Review error details in browser developer console (F12)
