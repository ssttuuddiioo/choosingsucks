# Foonder

Help small groups decide where to eat with near-zero friction.

## Overview

Foonder is a real-time collaborative decision-making app that helps groups quickly agree on a restaurant. Using a simple swipe interface similar to dating apps, participants vote on restaurant options, and when everyone agrees on a place, it's a match!

## Features

- **Zero-friction joining**: No accounts required for participants
- **Real-time updates**: See who's joined and who's finished swiping
- **Swipe interface**: Simple yes/no decisions with gesture support
- **Instant matches**: Automatic detection when everyone agrees
- **Notifications**: Optional email/SMS alerts for hosts
- **Mobile-first**: Designed for quick decisions on the go

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Realtime, Edge Functions)
- **APIs**: Google Places API for restaurant data
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google Cloud account (for Places API)
- (Optional) Resend account for email notifications
- (Optional) Twilio account for SMS notifications

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Add your Supabase project URL and keys
   - Add your Google Maps API key
   - (Optional) Add Resend and Twilio credentials

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## How It Works

1. **Host creates a session**: Enter a ZIP code and optional settings
2. **Share the link**: Copy and send to your group
3. **Everyone swipes**: Participants see restaurant cards and swipe yes/no
4. **Match found**: When everyone likes the same place, it's a match!
5. **Get directions**: Links to open in Google Maps

## Database Schema

The app uses PostgreSQL with PostGIS for location data:

- `sessions`: Active decision sessions
- `participants`: People in each session
- `candidates`: Restaurant options
- `swipes`: Individual votes
- `analytics_global`: Anonymous usage data

## Edge Functions

- `geocode`: Convert ZIP codes to coordinates
- `places-search`: Find nearby restaurants
- `analytics`: Track anonymous usage
- `send-notification`: Email/SMS alerts

## Contributing

This project follows modular design principles. Keep files under 600 lines and organize code into logical components.

## License

MIT

