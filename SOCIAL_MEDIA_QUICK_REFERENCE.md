# Social Media Metadata - Quick Reference Card

## 🎯 At a Glance

| Item                  | Status         | Reference                             |
| --------------------- | -------------- | ------------------------------------- |
| **OpenGraph Tags**    | ✅ Implemented | `app/article/[slug]/page.tsx`         |
| **Twitter Cards**     | ✅ Implemented | `app/article/[slug]/page.tsx`         |
| **Image Validation**  | ✅ Implemented | `lib/social-media-metadata.ts`        |
| **URL Normalization** | ✅ Implemented | `lib/utils.ts`                        |
| **Diagnostic Tool**   | ✅ Available   | `diagnose-metadata.js`                |
| **Validation Script** | ✅ Available   | `scripts/validate-social-metadata.js` |

---

## 🔧 Commands

### Test Article Thumbnails

```bash
# Validate deployed article
node scripts/validate-social-metadata.js https://intambwemedia.com/article/slug

# Check meta tags in HTML
curl -s https://intambwemedia.com/article/slug | grep "og:image\|twitter:image"

# Find broken images
find public/uploads -type f -exec du -b {} + | awk '$1 < 10000'
```

### Clear Social Platform Caches

```
Facebook:   https://developers.facebook.com/tools/debug/sharing/
Twitter:    https://cards-dev.twitter.com/validator
LinkedIn:   Share article → Verify preview loads
```

---

## ⚠️ Common Issues

| Problem           | Symptom                   | Fix                                              |
| ----------------- | ------------------------- | ------------------------------------------------ |
| **No thumbnail**  | Share shows no image      | Use Facebook Sharing Debugger to refresh         |
| **Wrong image**   | Wrong article image shows | Article missing featured image (uses logo)       |
| **Broken link**   | "Image failed to load"    | Image file deleted - check `/public/uploads/`    |
| **Relative path** | Image URL not absolute    | Contact dev - `normalizeArticleImageUrl()` issue |

---

## ✅ Deployment Checklist

- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Images valid: `find public/uploads -type f -exec du -b {} +`
- [ ] Deploy to production
- [ ] Wait 2-3 minutes for caches to clear
- [ ] Test on Facebook Sharing Debugger
- [ ] Test on Twitter Card Validator
- [ ] Verify in Google Search Console
- [ ] Monitor logs for image 404s

---

## 📁 Key Files

```
app/
  article/
    [slug]/
      page.tsx ← Generates OpenGraph & Twitter metadata

lib/
  social-media-metadata.ts ← Image validation & URL resolution
  utils.ts ← Image path normalization

scripts/
  validate-social-metadata.js ← Test tool for thumbnails

public/
  uploads/ ← Where article images are stored
```

---

## 🚀 Success Criteria

✅ When these are true, you've succeeded:

1. Sharing article on **Facebook** shows title + image + description
2. Sharing article on **Twitter** shows summary_large_image card
3. Sharing article on **LinkedIn** shows preview thumbnail
4. Sharing article on **WhatsApp** shows image preview
5. **Google Search Console** shows rich snippet preview
6. **No 404 errors** for image URLs in server logs

---

## 📍 Current Status

- ✅ **Implemented**: Complete social media metadata infrastructure
- ✅ **Tested**: Validation functions working correctly
- ✅ **Deployed**: Ready for production
- ⏳ **Monitoring**: Set up logs to track image 404s
- 📅 **Maintenance**: Check monthly for corrupted images

---

## 🆘 Need Help?

1. **Article metadata not generating?**
   → Check: Is article image path in database? Is path absolute?
2. **Image shows broken link to social platforms?**
   → Check: Does image file exist in `/public/uploads/`? Is it > 10KB?
3. **Wrong image shows on social platforms?**
   → Check: Is article's featured image field populated? Clear platform cache.
4. **Need to force refresh on social media?**
   → Use: **Facebook**: Sharing Debugger / **Twitter**: Card Validator / **LinkedIn**: Compose tweet

---

## 📞 Contact

- **Dev Team**: Handle image validation & normalization issues
- **Content Team**: Ensure articles have featured images before publishing
- **Ops Team**: Monitor `/public/uploads/` for corrupted files monthly

---

**Status**: ✅ Production Ready  
**Last Updated**: April 13, 2026  
**Team**: Engineering
