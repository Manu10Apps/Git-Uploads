# Local Testing Guide - KPay Rwanda Integration

This guide walks you through testing the KPay Rwanda payment system locally before production deployment.

## Prerequisites

Before testing locally, ensure you have:

- [x] Node.js 16+ installed (`node --version`)
- [x] npm installed (`npm --version`)
- [x] Project dependencies installed (`npm install`)
- [x] `.env.local` file with KPay credentials (or use dummy values for UI testing)

## Part 1: Frontend Testing (No API Required)

These tests verify the UI and user experience without needing KPay credentials.

### Test 1.1: Premium Button Navigation

**Goal:** Verify the "Ifatabuguzi" button navigates to premium page

**Steps:**

1. Start dev server: `npm run dev`
2. Visit http://localhost:3000
3. Look for button that says "Ifatabuguzi" in the header
   - Desktop: Top navigation bar
   - Mobile: Hamburger menu
4. Click the button
5. Should navigate to http://localhost:3000/premium

**Expected Result:**
✅ Button visible with text "Ifatabuguzi"  
✅ Navigates to `/premium` route  
✅ No console errors

**Troubleshooting:**

- If button doesn't appear: Check [app/components/Header.tsx](app/components/Header.tsx)
- If text is wrong: Search for "Iyandikishe" and ensure it's changed to "Ifatabuguzi"
- If console has errors: Check browser F12 → Console tab

### Test 1.2: Premium Page Form Elements

**Goal:** Verify all form elements render correctly

**Steps:**

1. Navigate to http://localhost:3000/premium
2. Verify you see:
   - [ ] Amount selector buttons: 200, 500, 1000, 1500, 2000
   - [ ] Phone number input field
   - [ ] "Rema icyuma" (Pay Now) button
   - [ ] Receiver info: "Emmanuel Ndahayo (0788823265)"
   - [ ] Status message area (initially hidden)

**Expected Result:**
✅ All elements visible  
✅ Buttons are clickable  
✅ Input field accepts text  
✅ No layout issues

**Troubleshooting:**

- Missing elements: Check [app/premium/page.tsx](app/premium/page.tsx)
- Button text wrong: Search for "Rema icyuma" string
- Input field not working: Check phone input type and placeholder

### Test 1.3: Amount Selection

**Goal:** Verify amount buttons work and update display

**Steps:**

1. On premium page, click different amount buttons
2. Each time you click:
   - Button should become highlighted (active state)
   - Amount display should update
   - Other buttons should deselect

**Test Cases:**

```
Click: 200  → Shows: 200 RWF ✓
Click: 500  → Shows: 500 RWF ✓
Click: 1000 → Shows: 1000 RWF ✓
Click: 1500 → Shows: 1500 RWF ✓
Click: 2000 → Shows: 2000 RWF ✓
```

**Expected Result:**
✅ Only one amount selected at a time  
✅ Display updates on each click  
✅ Selected button styling visible

**Troubleshooting:**

- Buttons not responding: Check onClick handlers in page.tsx
- Amount not updating: Check state management (useState for selectedAmount)

### Test 1.4: Phone Input Validation

**Goal:** Verify phone input accepts/rejects correct formats

**Steps:**

1. Click phone input field
2. Try different phone number formats:

| Input           | Expected                    | Status |
| --------------- | --------------------------- | ------ |
| `0788823265`    | Accept (MTN)                | ✓      |
| `0789123456`    | Accept (MTN)                | ✓      |
| `0703456789`    | Accept (Airtel)             | ✓      |
| `0706123456`    | Accept (Airtel)             | ✓      |
| `+250788823265` | Accept (convert to 256)     | ✓      |
| `250788823265`  | Accept (already 256 format) | ✓      |
| `0700000000`    | Reject (invalid network)    | ⚠️     |
| `123`           | Reject (too short)          | ⚠️     |
| `abc`           | Reject (letters only)       | ⚠️     |

**Expected Result:**
✅ Valid MTN/Airtel numbers accepted  
✅ Phone field shows validation state  
✅ Submit button disabled if phone invalid

**Troubleshooting:**

- All numbers accepted: Check validation regex in page.tsx
- Valid numbers rejected: Review phone normalization logic
- No visual feedback: Check error message styling

## Part 2: API Testing (Requires Dummy Credentials)

These tests verify the API endpoints work without sending real payments.

### Setup: Create Dummy Environment Variables

If you don't have real KPay credentials yet, create `.env.local` with dummy values:

```env
# For testing UI only (no real KPay API)
KPAY_API_KEY=test_key_12345
KPAY_MERCHANT_ID=test_merchant_98765
KPAY_API_URL=https://api.kpay.rw
KPAY_WEBHOOK_SECRET=test_webhook_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **Note:** Payments will fail with dummy credentials, but you'll see the error handling.

### Test 2.1: Payment Endpoint Response

**Goal:** Verify `/api/premium/payment` endpoint responds correctly

**Steps:**

1. Open terminal in project root
2. Run test command:

```bash
curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "phoneNumber": "0788823265",
    "language": "ky"
  }'
```

**Response should be one of:**

**Success (with real KPay credentials):**

```json
{
  "success": true,
  "message": "Ayiswe umusaza w'icyuma",
  "transactionId": "INTAMBWE-1704067200000-abc123",
  "amount": 500,
  "receiver": "Emmanuel Ndahayo"
}
```

**Validation Error (with dummy credentials):**

```json
{
  "success": false,
  "message": "API error: [error details]"
}
```

**Expected Result:**
✅ Endpoint responds (not 404 or 500)  
✅ Returns valid JSON  
✅ Includes success/message fields

**Troubleshooting:**

- 404 Not Found: Verify file exists at [/app/api/premium/payment/route.ts](/app/api/premium/payment/route.ts)
- 500 Error: Check server logs (terminal running `npm run dev`)
- Empty response: Check route exports `export async function POST`

### Test 2.2: Phone Validation in API

**Goal:** Verify server-side phone validation works

**Test Cases:**

```bash
# Valid: MTN
curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "phoneNumber": "0788823265", "language": "ky"}'
# Expected: success or KPay error

# Valid: Airtel
curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "phoneNumber": "0703456789", "language": "en"}'
# Expected: success or KPay error

# Invalid: Wrong network
curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "phoneNumber": "0700000000", "language": "ky"}'
# Expected: error message about invalid network

# Invalid: Too short
curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "phoneNumber": "078", "language": "ky"}'
# Expected: error message about invalid format
```

**Expected Results:**
✅ Valid numbers process  
✅ Invalid numbers rejected with error message  
✅ Error messages in requested language

### Test 2.3: Amount Validation in API

**Goal:** Verify amount validation works

**Test Cases:**

```bash
# Valid amounts
curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 200, "phoneNumber": "0788823265", "language": "ky"}'
# Min: should succeed

curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "phoneNumber": "0788823265", "language": "ky"}'
# Large amount: should succeed (no upper limit)

# Invalid amounts
curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "phoneNumber": "0788823265", "language": "ky"}'
# Below minimum: should fail

curl -X POST http://localhost:3000/api/premium/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 0, "phoneNumber": "0788823265", "language": "ky"}'
# Zero: should fail
```

**Expected Results:**
✅ 200+ RWF accepted  
✅ No upper limit (50000+ works)  
✅ < 200 RWF rejected  
✅ Error messages clear

### Test 2.4: Verify Endpoint

**Goal:** Test the payment verification endpoint

**Note:** This requires a real transactionId from a successful payment.

```bash
# Check payment status
curl -X GET "http://localhost:3000/api/premium/verify?tx_ref=INTAMBWE-1704067200000-abc123" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "status": "success",
  "message": "Payment confirmed",
  "amount": 500,
  "phone": "256788823265"
}
```

## Part 3: End-to-End Testing (With UI)

### Test 3.1: Full Payment Form Submission

**Goal:** Verify form submission sends correct data to API

**Steps:**

1. Open http://localhost:3000/premium in browser
2. Select amount: 500 RWF
3. Enter phone: 0788823265
4. Click "Rema icyuma" (Pay Now)
5. Watch network tab in developer tools:
   - F12 → Network tab
   - Look for POST request to `/api/premium/payment`
   - Check request payload includes amount, phoneNumber, language

**Expected Result:**
✅ Form submits (button shows loading state)  
✅ POST request sent to API  
✅ Payload includes: amount, phoneNumber, language  
✅ Response received (success or error)  
✅ Status message displays

### Test 3.2: Error Message Display

**Goal:** Verify error messages display correctly in user's language

**Test Cases:**

**Kinyarwanda Error (language: "ky"):**

1. Select 500 RWF
2. Enter invalid phone: 0700000000
3. Click "Rema icyuma"
4. Should see error in Kinyarwanda

**English Error (language: "en"):**

1. Change language to English
2. Repeat above steps
3. Should see error in English

**Expected Result:**
✅ Error messages appear  
✅ Messages in correct language  
✅ Error is clear to user

### Test 3.3: Loading and Status States

**Goal:** Verify UI shows appropriate states during payment

**Steps:**

1. Enter valid amount and phone
2. Click "Rema icyuma"
3. Watch status message:
   - [ ] "Ayiswe umusaza w'icyuma" (Kinyarwanda) or "Processing..." (English)
   - [ ] Message shows in blue (processing color)
   - [ ] Button becomes disabled
   - [ ] Loading spinner appears (optional)
4. Wait for response
5. Status message updates to success or error

**Expected Result:**
✅ Processing state shows immediately  
✅ User can't submit again (button disabled)  
✅ Status message updates after API response

## Part 4: UI Behavior Testing

### Test 4.1: Top Stories Widget

**Goal:** Verify INKURU NYAMUKURU section on article pages

**Steps:**

1. Navigate to any article page (e.g., http://localhost:3000/article/any-slug)
2. Look at right sidebar
3. Top of sidebar should show "INKURU NYAMUKURU" section
4. Should display 5 stories with:
   - [ ] Story title (bold text)
   - [ ] Publication date
   - [ ] Left border accent (red)
   - [ ] Ordered list (1, 2, 3, 4, 5)

**Expected Result:**
✅ Section visible at top of sidebar  
✅ Shows 5 stories  
✅ Proper formatting (bold titles, dates)  
✅ Stories are clickable

**Troubleshooting:**

- Not visible: Check [app/article/[slug]/ArticlePageClient.tsx](app/article/[slug]/ArticlePageClient.tsx)
- Wrong position: Verify it's rendered before other sidebar sections
- No stories: Check `/api/articles?limit=5` endpoint returns data

### Test 4.2: Dark Mode Compatibility

**Goal:** Verify UI works in dark mode

**Steps:**

1. On http://localhost:3000/premium page
2. Toggle dark mode:
   - Check system preferences
   - Or use VS Code dark theme
3. Verify:
   - [ ] Text is readable
   - [ ] Buttons are visible
   - [ ] Form inputs are visible
   - [ ] Colors contrast well

**Expected Result:**
✅ Page readable in dark mode  
✅ All elements visible  
✅ Good color contrast

### Test 4.3: Responsive Design

**Goal:** Verify page works on mobile and desktop

**Steps:**

1. Open http://localhost:3000/premium
2. Test on different screen sizes:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
3. Check:
   - [ ] Form elements stack properly
   - [ ] Buttons are large enough to tap
   - [ ] Text is readable
   - [ ] No horizontal scrolling

**Browser DevTools:**

```
F12 → Click device toggle → Select device
```

**Expected Result:**
✅ Responsive on all sizes  
✅ Mobile friendly  
✅ Touch targets large enough

## Part 5: Integration Readiness Checklist

Before production deployment, verify all tests pass:

### Frontend Tests

- [x] Premium button visible and navigates to `/premium`
- [x] Premium page loads all form elements
- [x] Amount selection works
- [x] Phone input accepts valid formats
- [x] INKURU NYAMUKURU widget displays on articles
- [x] Dark mode compatible
- [x] Responsive on mobile/tablet/desktop

### API Tests

- [x] Payment endpoint responds to requests
- [x] Phone validation works server-side
- [x] Amount validation enforces 200+ RWF
- [x] No upper limit on amounts
- [x] Verify endpoint returns status

### Form Tests

- [x] Form submits with all required data
- [x] Error messages display correctly
- [x] Loading states show during processing
- [x] Response status displayed to user
- [x] Language-specific messages work

### Code Quality

- [x] No console errors or warnings
- [x] No 404 errors on API routes
- [x] No Flutterwave references in code
- [x] Environment variables properly used
- [x] No hardcoded credentials

## Test Report Template

When testing, document results:

```markdown
# KPay Integration Test Report

Date: ****\_\_\_****
Tested by: ****\_\_\_****

## Frontend Tests

- [ ] Premium button visible: YES / NO
- [ ] /premium route loads: YES / NO
- [ ] Form elements visible: YES / NO
- [ ] Dark mode works: YES / NO
- [ ] Mobile responsive: YES / NO

## API Tests

- [ ] Payment endpoint responds: YES / NO
- [ ] Phone validation works: YES / NO
- [ ] Amount validation works: YES / NO
- [ ] Error messages display: YES / NO

## Issues Found

(List any problems or unexpected behavior)

1. ...
2. ...

## Status

[ ] All tests passed - READY FOR PRODUCTION
[ ] Some tests failed - NEEDS FIXES
[ ] Unable to complete tests

## Notes

(Additional observations or feedback)
```

## Common Issues & Solutions

| Issue                            | Solution                                           |
| -------------------------------- | -------------------------------------------------- |
| "KPAY_API_KEY is undefined"      | Add it to `.env.local` and restart `npm run dev`   |
| Button doesn't say "Ifatabuguzi" | Check Header.tsx has been updated                  |
| Premium page shows 404           | Verify file exists at `/app/premium/page.tsx`      |
| API endpoint returns 500         | Check server logs for error details                |
| Phone validation always fails    | Verify regex in payment/route.ts checks 256 prefix |
| Form never submits               | Check browser console (F12) for client-side errors |

## Next Steps After Testing

1. ✅ Complete all tests above
2. ✅ Document any issues found
3. ✅ Fix issues (or get real KPay credentials to test payments)
4. ✅ Follow [KPAY_DEPLOYMENT_CHECKLIST.md](KPAY_DEPLOYMENT_CHECKLIST.md) for production
5. ✅ Register for KPay account
6. ✅ Configure real credentials
7. ✅ Test with real payments
8. ✅ Deploy to production

## Support

If tests fail or you need help:

1. **Check server logs:** Terminal where you ran `npm run dev`
2. **Check browser console:** F12 → Console tab
3. **Check network tab:** F12 → Network tab
4. **Review code files:** Files listed above
5. **Review documentation:** KPAY_SETUP.md and this file

---

**Test Status:** Ready for local testing  
**Credentials Required:** Optional (UI tests work without them)  
**Real Payments:** Not possible with dummy credentials  
**Production Ready:** After passing all tests ✅
