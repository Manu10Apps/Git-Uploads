# Admin Panel & AI News Generator Setup Guide

## Overview

The improved admin panel includes a professional sidebar layout and an AI-powered news generator that can create articles using OpenAI ChatGPT API.

## Features

### 1. Improved Admin Panel

- **Responsive Sidebar Navigation**
  - Collapsible sidebar (full width or icon-only)
  - Active route highlighting
  - Quick access to all admin features
  - User email display
  - One-click logout

- **Navigation Items**
  - Articles - View and manage all articles
  - Create Article - Manually create new articles
  - AI Generator - Generate articles with AI
  - Adverts - Manage advertisements

### 2. AI News Generator

- **Generate Quality Articles** with titles and topics
- **Multiple Tones**: Journalistic, Professional, Casual
- **Multi-language Support**: English, Kinyarwanda, Swahili
- **Smart Features**:
  - Auto-generated excerpts
  - Read time estimation
  - Copy-to-clipboard for each field
  - Preview before publishing

## Setup Instructions

### Step 1: Get OpenAI API Key

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign up or login
3. Navigate to API keys
4. Create a new API key
5. Copy it securely

### Step 2: Configure Environment

Add to your `.env.local`:

```bash
# AI News Generator
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
# Optional model override
# OPENAI_MODEL=gpt-4o-mini
```

### Step 3: Test the AI Generator

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/admin/login`
3. Login with your admin credentials
4. Click "AI Generator" in the sidebar
5. Fill in:
   - **Title**: Article headline
   - **Topic**: Key points or description
   - **Tone**: Style preference
   - **Language**: Output language
6. Click "Generate Article"

## Files Created/Modified

### New Files

- `app/admin/ai-generator/page.tsx` - AI generator interface

### Modified Files

- `app/admin/layout.tsx` - Improved sidebar layout
- `.env.example` - Added OPENAI_API_KEY template

## How to Use

### Generate an Article

1. In admin panel, click "AI Generator"
2. Enter article title and topic
3. Select tone and language
4. Click "Generate Article"
5. Copy the generated content
6. Use "Create Article" to finalize and publish

### Best Practices for AI Generation

**Good Topic Descriptions:**

```
Rwanda's technology sector has seen significant growth with new startups emerging
in fintech and agriculture tech. Focus on job creation, investment trends, and
success stories from Kigali and Kigobe.
```

**Poor Topic Descriptions:**

```
Tech in Rwanda
```

**Tips:**

- Be specific about what you want included
- Mention key data points or statistics if known
- Give context about the news angle
- Specify tone to match your audience

## Troubleshooting

### "AI generator not loading"

- Ensure internet access is available so Puter SDK can load
- Refresh the page and wait until the AI button is enabled
- Check browser console for Puter SDK loading errors

### Article generation too slow

- Initial requests may take 10-15 seconds
- Subsequent requests are faster
- Consider the complexity of your topic

### Generated content quality issues

- Be more specific in your topic description
- Provide more context and details
- Try different tones to see what works best

### Language output is wrong

- Ensure you selected the correct language
- For Kinyarwanda and Swahili, be more descriptive
- English typically produces longer content

## Future Enhancements

Potential improvements:

- Batch generation of multiple articles
- Article templates for specific news types
- Auto-categorization of generated articles
- SEO optimization suggestions
- Multi-source research integration

## Support

For issues:

1. Check `.env.local` configuration
2. Review browser console for error messages
3. Confirm Puter AI script loads successfully
