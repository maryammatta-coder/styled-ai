# Styled.ai - Complete Project Documentation

## Project Overview
Styled.ai is an AI-powered personal stylist web application that helps users organize their closet digitally and generates personalized outfit recommendations using OpenAI's GPT-4 and Vision APIs.

**GitHub Repository:** https://github.com/maryammatta-coder/styled-ai
**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase, OpenAI API

---

## Current Features (V1 - Completed)

### ✅ Authentication
- Email/password signup and login
- Supabase Auth integration
- Auto-create user profile on signup

### ✅ Onboarding
- 4-step style quiz capturing:
  - Style vibes (Elevated Basics, Resort, Minimalist, Chic, etc.)
  - Favorite colors
  - Colors to avoid
  - Budget level ($, $$, $$$, $$$$)
- Progress indicator
- Saves preferences to user profile

### ✅ Closet Management
- Upload multiple clothing images
- AI-powered automatic classification using GPT-4 Vision
- Extracts: name, category, color, season, vibe, fit
- View all items in grid layout
- Delete/archive items
- Supabase Storage for images

### ✅ AI Outfit Generation
Three modes:
1. **My Closet Only** - Uses only existing items
2. **Mix & Match** - Combines closet items with new purchase suggestions
3. **New Items Only** - Suggests complete outfit with new items to buy

Features:
- Occasion selection (Date Night, Work Meeting, Brunch, etc.)
- Weather-aware recommendations (currently hardcoded to Miami 78°F)
- Style-aware based on user preferences
- Displays outfit cards with images and styling rationale

### ✅ Dashboard
- Quick action cards (Generate Outfit, My Closet, Calendar)
- Outfit gallery showing:
  - Closet items with images
  - New item suggestions with descriptions
  - Weather and style rationale
- Item count display
- Logout functionality

---

## Tech Stack Details

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State Management:** React hooks (useState, useEffect)

### Backend
- **Database & Auth:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (for closet images)
- **AI:** OpenAI API
  - GPT-4o-mini for text generation
  - GPT-4o-mini with vision for image classification

### APIs
- `/api/closet/classify` - AI classification of clothing items
- `/api/outfits/generate` - AI outfit generation with 3 modes

---

## Database Schema (Supabase)

### Table: `users`
```sql
- id (uuid, pk, fk to auth.users)
- email (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- style_vibe (jsonb array)
- color_palette (jsonb array)
- avoid_colors (jsonb array)
- budget_level (text)
- preferred_brands (jsonb array)
- home_city (text)
- home_region (text)
- home_country (text)
- timezone (text)
- use_auto_location (boolean)
- use_calendar_styling (boolean)
- plan_ahead_days (integer)
```

### Table: `closet_items`
```sql
- id (uuid, pk)
- user_id (uuid, fk)
- image_url (text)
- name (text)
- category (text)
- color (text)
- season (jsonb array)
- vibe (jsonb array)
- fit (text)
- brand (text)
- source (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- is_archived (boolean)
```

### Table: `outfits`
```sql
- id (uuid, pk)
- user_id (uuid, fk)
- label (text)
- context_type (text)
- context_id (uuid, nullable)
- date (date)
- created_at (timestamptz)
- outfit_data (jsonb) containing:
  - closet_item_ids (array)
  - new_items (array of objects)
  - weather_rationale (text)
  - style_rationale (text)
```

### Storage Bucket: `closet-images`
- Public bucket for user clothing images
- Policies: authenticated insert, public select, authenticated delete

---

## Project Structure

```
styled-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx          # Login/Signup page
│   │   ├── api/
│   │   │   ├── closet/
│   │   │   │   └── classify/
│   │   │   │       └── route.ts      # AI item classification
│   │   │   └── outfits/
│   │   │       └── generate/
│   │   │           └── route.ts      # AI outfit generation
│   │   ├── closet/
│   │   │   └── page.tsx              # Closet management page
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Main dashboard
│   │   ├── onboarding/
│   │   │   └── page.tsx              # Style quiz
│   │   ├── outfits/
│   │   │   └── generate/
│   │   │       └── page.tsx          # Outfit generation page
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Homepage
│   │   └── globals.css               # Global styles
│   ├── lib/
│   │   ├── openai/
│   │   │   ├── client.ts             # OpenAI client setup
│   │   │   └── vision.ts             # Vision API functions
│   │   ├── supabase/
│   │   │   └── client.ts             # Supabase client
│   │   └── utils/
│   │       └── constants.ts          # App constants
│   └── types/
│       └── index.ts                  # TypeScript types
├── .env.local                        # Environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

---

## Environment Variables (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Weather API (not yet implemented)
WEATHER_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/maryammatta-coder/styled-ai.git
cd styled-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Supabase
1. Create project at supabase.com
2. Run SQL migrations (see Database Schema above)
3. Create `closet-images` storage bucket (public)
4. Set up storage policies
5. Disable email confirmation in Auth settings (for development)
6. Copy project URL and keys to `.env.local`

### 4. Set Up OpenAI
1. Get API key from platform.openai.com
2. Add to `.env.local`

### 5. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000

---

## Known Issues & Notes

### Current Limitations
- RLS (Row Level Security) is disabled on `users` table for development
- Weather data is hardcoded (78°F, Sunny, Miami)
- No real location services yet
- No calendar integration (V2 feature)
- No Shopify integration (V2 feature)

### Important Security Notes
- `.env.local` is in `.gitignore` - NEVER commit API keys
- Re-enable RLS before production deployment
- Implement proper server-side auth for API routes

---

## V2 Features (Planned - Not Yet Implemented)

### Calendar Integration
- Google Calendar OAuth
- Automatic event detection
- Auto-generate outfits for upcoming events
- Trip detection and packing lists

### Location & Weather
- Real-time location detection
- Live weather API integration
- City/timezone auto-detection
- Weather-based outfit suggestions

### E-commerce
- Shopify integration
- Auto-import purchased items
- Shopping links for suggested items
- Price tracking

### Social & Sharing
- Save favorite outfits
- Share outfit boards
- Style inspiration feed

### Enhanced AI Features
- Body shape recommendations
- Seasonal wardrobe analysis
- Closet gap analysis
- Virtual try-on (future)

---

## Development Workflow

### Making Changes
```bash
# Make your changes
git add .
git commit -m "Description of changes"
git push origin main
```

### Testing Flow
1. Sign up with new email
2. Complete onboarding quiz
3. Upload 3-5 clothing items to closet
4. Generate outfits in all 3 modes
5. Verify items display correctly
6. Test delete functionality

### Debugging
- Check browser console (F12) for frontend errors
- Check terminal for API/server errors
- Monitor Supabase logs for database issues
- Check OpenAI usage dashboard for API errors

---

## API Documentation

### POST `/api/closet/classify`
Classifies uploaded clothing item using AI vision.

**Request:**
```json
{
  "imageUrl": "https://...",
  "itemId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "classification": {
    "name": "Beige Knit Sweater",
    "category": "top",
    "color": "beige",
    "season": ["fall", "winter"],
    "vibe": ["casual", "elevated basics"],
    "fit": "relaxed"
  }
}
```

### POST `/api/outfits/generate`
Generates AI-styled outfit based on occasion and preferences.

**Request:**
```json
{
  "occasion": "Date Night",
  "itemSource": "closet" | "mix" | "new"
}
```

**Response:**
```json
{
  "success": true,
  "outfit": {
    "id": "uuid",
    "label": "Casual Elegance Date Night",
    "outfit_data": {
      "closet_item_ids": ["uuid1", "uuid2"],
      "new_items": [
        {
          "description": "Black leather loafers",
          "category": "shoes",
          "reasoning": "Polished and comfortable"
        }
      ],
      "weather_rationale": "Perfect for 78°F...",
      "style_rationale": "Matches your elevated basics style..."
    }
  }
}
```

---

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Git
git status              # Check changes
git add .               # Stage all changes
git commit -m "msg"     # Commit changes
git push origin main    # Push to GitHub
git pull origin main    # Pull latest changes

# Supabase
# Access via dashboard: https://supabase.com/dashboard
```

---

## Troubleshooting

### "Email not confirmed" error
- Disable email confirmation in Supabase Auth settings

### Images not uploading
- Check Supabase storage bucket policies
- Verify bucket is public
- Check browser console for CORS errors

### AI classification not working
- Verify OpenAI API key in `.env.local`
- Check OpenAI account has credits
- Restart dev server after adding keys

### TypeScript errors
- Run `npm install` to ensure all packages installed
- Restart VS Code
- Check `tsconfig.json` has `"jsx": "preserve"`

---

## Next Steps for Development

### Immediate Improvements
1. Add profile page to edit user preferences
2. Implement real weather API (OpenWeatherMap)
3. Add outfit editing/deletion
4. Improve AI prompts for better outfit quality
5. Add loading states and error handling

### Short Term (1-2 weeks)
1. Re-enable and fix RLS policies
2. Add location services
3. Implement Google Calendar OAuth
4. Create trip planning feature
5. Add outfit history/favorites

### Long Term (1+ months)
1. Shopify integration
2. Mobile responsive improvements
3. PWA (Progressive Web App) support
4. Social features
5. Premium features/monetization

---

## Resources & Documentation

- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **OpenAI API Docs:** https://platform.openai.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs

---

## Contact & Support

**Developer:** Maryam Matta
**GitHub:** https://github.com/maryammatta-coder
**Repository:** https://github.com/maryammatta-coder/styled-ai

---

## License

Private project - All rights reserved

---

*Last Updated: January 2025*
*Version: 1.0.0 (MVP)*