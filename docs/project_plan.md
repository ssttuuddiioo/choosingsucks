# Foonder Project Plan - Current State & Future Vision

## 🎯 **Mission & Core Insight**

**Mission**: Make group decision-making as fast and simple as possible by eliminating the burden of considering what others want.

**Core Insight**: It's easy to make decisions for yourself, but difficult to also consider what others want. We remove that cognitive load by letting everyone vote privately, then revealing only the overlaps.

**Strategy**: Always reduce clicks, eliminate friction, make everything intuitive. Every feature should make decisions faster, not slower.

## 🏗️ **Current Implementation Status**

### ✅ **FULLY FUNCTIONAL CATEGORIES**

#### 1. **Restaurants** 🍽️
- **Status**: Production ready, fully functional
- **API**: Google Places integration via Edge Functions
- **Features**: ZIP code search, price filtering, real-time voting, unanimous matches, Rock Paper Scissors tiebreaker
- **Database**: Full integration with all core tables

#### 2. **Streaming** 🎬
- **Status**: Production ready, fully functional (just completed)
- **API**: Watchmode integration for movies/TV shows
- **Features**: Content type selection, streaming service filtering, genre preferences, real-time voting, match detection
- **Database**: Full integration with extended candidate schema

### 🔄 **COMING SOON CATEGORIES**
3. **Delivery** 🚚 - Food delivery (DoorDash, UberEats)
4. **Movies** 🎭 - Theater showtimes (Fandango)  
5. **Music** 🎵 - Songs/artists (Spotify, Apple Music)
6. **Gifts** 🎁 - Gift ideas (Amazon, Etsy)
7. **Activities** 🎯 - Local events (Eventbrite, Meetup)
8. **Dates** 💕 - Date ideas (Yelp, Foursquare)

## 🎨 **Design Principles**

### **Core UX Philosophy**
- **Friction Elimination**: Always reduce clicks, make everything intuitive
- **Cognitive Load Reduction**: Remove the burden of considering others' preferences
- **Speed Over Features**: Every addition must make decisions faster, not slower
- **Gen Z Native**: Designed for mobile-first, gesture-driven users

### **UI Guidelines**
- **Mobile First**: One primary action per screen, thumb-friendly interactions
- **Fewer Choices**: Reduce fields and decision fatigue at every step
- **Obvious Progress**: Always show "what happens next" 
- **Real-time When Helpful**: Live updates that build momentum, silent otherwise
- **Subtle Delight**: Brief animations, haptic feedback, no gimmicks
- **Zero Emojis**: Clean, modern aesthetic without childish elements
- **Accessibility**: Large targets, high contrast, screen reader support

## 🔧 **Technical Architecture**

### **Stack**
- **Frontend**: Next.js 15.5.0 (App Router), React, TypeScript
- **Styling**: Tailwind CSS with custom gradients and glassmorphism
- **Animation**: Framer Motion, @use-gesture/react
- **Backend**: Supabase (Postgres, Realtime, Edge Functions)
- **APIs**: Google Places (restaurants), Watchmode (streaming)
- **Deployment**: Vercel (via GitHub)

### **Session Flow (Universal Pattern)**
1. **Category Selection** → `/` homepage with 8 categories
2. **Setup** → `/category` page with category-specific preferences
3. **Session Creation** → API call creates database session + loads content
4. **Link Sharing** → `/category/[sessionId]?t=shareToken`
5. **Participant Joining** → Anonymous or named (host choice)
6. **Voting** → Swipe interface with real-time sync
7. **Match Detection** → Unanimous matches or Rock Paper Scissors
8. **Results** → Match screen or no-matches options

### **API Architecture**
- **Pattern**: `/api/{category}-search` for content loading
- **Implemented**: 
  - `POST /api/streaming-search` (Watchmode integration)
  - `POST /api/places-search` (Google Places via Edge Function)
- **Universal**: `POST /api/check-match` for all categories

### **Real-time Features**
- **Supabase Realtime** on `session:{sessionId}` channels
- **Events**: participant_update, match_found, no_matches_detected
- **Live Updates**: Vote counts, participant status, match results

---

## 🎯 **Target Audience & Brand**

### **Primary Users: Gen Z (18-26)**
- **Mobile Native**: Expect gesture-first, app-like web experiences
- **Decision Fatigue**: Overwhelmed by endless options, crave simplicity
- **Social**: Make decisions in groups, value shared experiences
- **Authentic**: Prefer direct, honest communication over corporate speak
- **Efficiency**: Want immediate results, low tolerance for slow experiences

### **Brand Positioning**
- **Name**: "choosing.sucks" - Direct acknowledgment of decision paralysis
- **Tone**: Playful but not childish, confident, slightly irreverent
- **Visual**: Bold gradients, glassmorphism, no emojis (clean, modern aesthetic)
- **Voice**: "Let's make it simple" - helpful without being condescending
- **Promise**: Turn group indecision into instant clarity

## 🗄️ **Database Architecture (Current)**

### **Core Tables**

#### `sessions` (76 rows active)
```sql
- id (uuid, pk)
- category (text) -- 'restaurants', 'streaming', etc.
- zip_code (text, nullable) -- For location-based categories
- place_search_center (geography, nullable)
- radius_m (int, default 8000)
- require_names (boolean, default false)
- invite_count_hint (int, nullable)
- status (enum: active, matched, closed)
- match_place_id (text, nullable)
- match_reason (text, nullable)
- match_requirement (text, default 'all') -- 'all' or 'majority'
- allow_multiple_matches (boolean, default false)
- search_radius_miles (numeric, default 2.5)
- preferences (jsonb, default '{}') -- Category-specific settings
- host_notify_email (text, nullable)
- host_notify_phone (text, nullable)
- created_at (timestamptz)
```

#### `candidates` (1,301 rows) - **Universal Multi-Category Schema**
```sql
-- Core fields (all content types)
- id (uuid, pk)
- session_id (uuid, fk)
- category (text) -- High-level category
- content_type (text) -- restaurant, movie, tv_series, delivery_food, etc.
- name (text) -- Display name
- description (text, nullable) -- Universal description
- image_url (text, nullable) -- Universal image field
- external_id (text, nullable) -- Third-party API IDs
- metadata (jsonb, default '{}') -- Flexible category-specific data
- tags (text[], nullable) -- Universal tagging system
- price_range (text, nullable)
- availability_info (jsonb, nullable)
- is_active (boolean, default true)

-- Location fields (restaurants, activities, movies, etc.)
- place_id (text) -- Google Place ID or external ID
- lat (numeric), lng (numeric)

-- Restaurant-specific fields
- photo_ref (text, nullable)
- price_level (int, nullable)
- rating (numeric, nullable)
- user_ratings_total (int, nullable)
- cuisines (text[], nullable)
- url (text, nullable)

-- Streaming-specific fields
- title (text, nullable)
- original_title (text, nullable)
- year (int, nullable)
- runtime_minutes (int, nullable)
- plot_overview (text, nullable)
- genre_names (text[], nullable)
- user_rating (numeric, nullable)
- critic_score (numeric, nullable)
- poster (text, nullable)
- backdrop (text, nullable)
- trailer (text, nullable)
- us_rating (text, nullable)
- sources (jsonb, nullable)
- created_at (timestamptz)
```

#### `participants` (225 rows)
```sql
- id (uuid, pk)
- session_id (uuid, fk)
- display_name (text, nullable)
- is_host (boolean, default false)
- joined_at (timestamptz, default now())
- submitted_at (timestamptz, nullable)
- client_fingerprint (text, nullable)
```

#### `swipes` (406 rows)
```sql
- id (uuid, pk)
- session_id (uuid, fk)
- participant_id (uuid, fk)
- candidate_id (uuid, fk)
- vote (smallint) -- 1 for yes, 0 for no
- created_at (timestamptz)
```

#### `analytics_global` (601 rows)
```sql
- id (bigserial, pk)
- event (text) -- session_created, swipe_yes, swipe_no, matched
- zip_code (text, nullable)
- place_id (text, nullable)
- meta (jsonb, default '{}')
- created_at (timestamptz)
```

### **Rock Paper Scissors System**
#### `rps_games` + `rps_moves`
- Full tiebreaker system for when no unanimous matches found
- Multi-round support with winner tracking

### **Future-Ready Tables**
#### `user_preferences` (0 rows) - Ready for user accounts
#### `user_activity` (0 rows) - Ready for ML/personalization  
#### `content_sources` (2 rows) - API management (watchmode, google_places)

---

## 🚀 **Current Functionality**

### **Restaurants Category** ✅
- ZIP code entry with geolocation fallback
- Price level selection ($-$$$$)
- People count (2-6+ with feature flag)
- Anonymous or named sessions
- Google Places API integration via Edge Functions
- Real-time voting with swipe interface
- Unanimous match detection
- Rock Paper Scissors for ties
- Match screen with restaurant details

### **Streaming Category** ✅
- Content type selection (Movies, TV Series, Both)
- Streaming service filtering (Netflix, Hulu, Disney+, etc.)
- Genre preferences (Action, Comedy, Drama, etc.)
- Sort preferences (Popular, New Releases)
- Watchmode API integration
- Real-time voting with swipe interface
- Match detection for streaming content
- Anonymous session sharing
- Card loading animations

### **Session Management** ✅
- Anonymous participants (no login required)
- Client fingerprinting for session persistence
- Real-time participant tracking via Supabase Realtime
- Vote synchronization across devices
- Session status: invited/joined/submitted counts
- Match detection with database queries
- No-matches fallback with Rock Paper Scissors
- 30-second timeout for content loading

---

## ⚙️ **Configuration**

### **Environment Variables**
```bash
# Core APIs
GOOGLE_PLACES_API_KEY=xxx
WATCHMODE_API_KEY=xxx

# Database
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Feature flags
NEXT_PUBLIC_ENABLE_MULTI_PERSON=false # Default: 2-person sessions
```

### **Feature Flags**
- **Multi-Person Sessions**: Currently disabled (2-person default)
- **Named Sessions**: Optional (host choice)
- **Match Requirements**: Unanimous (100%) or majority (50%)
- **Multiple Matches**: Disabled (first match wins)

---

## 📊 **Performance & Metrics**

### **Technical Performance**
- **Build**: ✅ Successful production builds
- **Bundle Size**: 142KB first load (optimized)
- **TypeScript**: ✅ Full type safety
- **Database**: 2,000+ total records across tables
- **API Response**: ~3s restaurants, ~18s streaming (optimized)

### **Current Data**
- **Sessions**: 76 created
- **Participants**: 225 total
- **Votes**: 406 swipes recorded
- **Analytics**: 601 events tracked
- **Categories**: 2/8 fully functional

---

## 🔮 **Future Development**

### **Phase 1: Complete Category Expansion**
- **Delivery**: DoorDash/UberEats API integration
- **Movies**: Fandango showtimes API
- **Music**: Spotify/Apple Music integration
- **Gifts**: Amazon/Etsy product APIs
- **Activities**: Eventbrite/Meetup event APIs
- **Dates**: Curated date idea database

### **Phase 2: User Accounts & Personalization**
- Supabase Auth integration
- User preference learning
- Recommendation engine based on voting history
- Saved sessions and favorites
- Cross-category preference insights

### **Phase 3: Advanced Features**
- Push notifications for matches
- Advanced matching algorithms (ML-based)
- Group size optimization
- Enhanced real-time features
- Social sharing improvements

### **Phase 4: Monetization**
- **Promoted Content**: Local businesses can ensure placement in candidate decks
- **Premium Photos**: Businesses can curate custom photos for their listings
- **Priority Placement**: Sponsored candidates appear higher in swipe order
- **Analytics Dashboard**: Business insights on voting patterns and preferences
- **API Access**: Third-party integrations for business management tools

---

## 🔒 **Security & Privacy**

### **Current Implementation**
- **No User Accounts**: Anonymous participation
- **Session Tokens**: Secure session sharing
- **Client Fingerprinting**: Device-based session persistence
- **Row Level Security**: Enabled on all user data tables
- **Rate Limiting**: Implemented in Edge Functions

### **Data Handling**
- **Minimal Data**: Only names (optional) and votes
- **Session Cleanup**: Manual deletion available
- **Analytics**: Aggregated, non-personal data only
- **Privacy**: No tracking across sessions

---

## 🏁 **Current Status: Production Ready**

**Last Updated**: December 2024  
**Build Status**: ✅ Successful  
**Categories Functional**: 2/8 (Restaurants, Streaming)  
**Database**: Future-proof architecture for all categories  
**User Experience**: Polished, mobile-optimized, real-time  

The application successfully delivers a bold, fast, mobile-first group decision-making experience with a solid foundation for rapid category expansion.