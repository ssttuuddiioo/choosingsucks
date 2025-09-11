# Feature Flags

This document describes the available feature flags in the application.

## Multi-Person Sessions

**Environment Variable:** `NEXT_PUBLIC_ENABLE_MULTI_PERSON`

**Default:** `false` (2-person sessions only)

**Description:** Controls whether the application supports sessions with more than 2 people.

### Usage

```bash
# Enable multi-person sessions
NEXT_PUBLIC_ENABLE_MULTI_PERSON=true

# Disable multi-person sessions (default)
NEXT_PUBLIC_ENABLE_MULTI_PERSON=false
```

### Behavior

**When `false` (default):**
- Sessions are limited to 2 people
- "How many people?" section is hidden from the setup UI
- "Require names?" section is hidden (defaults to `false`)
- "Matches Required" section is hidden (defaults to `100%`)
- "# of matches" section is hidden (defaults to `First match`)
- `inviteCount` defaults to '2'
- Simplified UI for stress testing 2-person logic

**When `true`:**
- Users can select 2-20 people for sessions
- "How many people?" section appears in the setup UI
- "Require names?" section appears with full functionality
- "Matches Required" section appears (100% or 50% options)
- "# of matches" section appears (First match or All matches)
- Full multi-person functionality is enabled
- Custom count input for 7+ people

### Implementation

The feature flag is checked in:
- `lib/utils/env.ts` - Environment variable configuration
- `app/restaurants/page.tsx` - Conditional UI rendering

```typescript
// Check if multi-person is enabled
if (env.features.multiPersonSessions) {
  // Show multi-person UI
}
```

### Testing

To test multi-person functionality:

1. Set the environment variable:
   ```bash
   NEXT_PUBLIC_ENABLE_MULTI_PERSON=true
   ```

2. Restart your development server

3. The "How many people?" section will appear in the restaurant setup

4. To revert to 2-person mode, set to `false` or remove the variable
