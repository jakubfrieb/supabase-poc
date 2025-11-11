<!-- # Facility Manager Mobile App -->

A modern mobile application built with React Native and Expo that allows users to manage facilities and track issues. Features Google OAuth authentication, real-time updates, and a clean, mobile-first design.

## Features

- **Google OAuth Authentication**: Secure sign-in with Google accounts
- **Facility Management**: Create, view, and manage multiple facilities
- **Issue Tracking**: Report and track issues within each facility
- **Priority & Status Management**: Organize issues by priority (low, medium, high, urgent) and status (open, in progress, resolved, closed)
- **Push Notifications**: Get notified when new issues are created (via Supabase Edge Functions)
- **Real-time Updates**: Powered by Supabase for instant data synchronization
- **Mobile-First Design**: Clean, intuitive UI optimized for mobile devices
- **Cross-Platform**: Works on iOS, Android, and Web

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL database, Authentication, Real-time subscriptions)
- **Language**: TypeScript
- **Navigation**: React Navigation
- **State Management**: React Hooks & Context API

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- A Supabase account (free tier available at https://supabase.com)
- A Google Cloud Console project (for OAuth)

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd supabase-poc
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at https://supabase.com
2. Go to Project Settings > API
3. Copy your project URL and anon/public key

### 4. Configure environment variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 5. Set up the database (base)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/schema.sql`
4. Paste and run the SQL script

This will create:
- `facilities` table
- `issues` table
- Row Level Security policies
- Indexes for performance
- Automatic timestamp triggers

### 6. Apply database migrations (incremental)

1. Open files in `supabase/migrations/` in ascending filename order
2. Run each script in the SQL Editor
3. Migrations are idempotent (safe to re-run)

### 7. Configure Google OAuth

Follow the detailed instructions in `SETUP_GUIDE.md` to:
1. Create a Google Cloud Console project
2. Set up OAuth credentials
3. Configure Supabase Auth with Google provider

### 8. Run the app

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## Project Structure

```
├── App.tsx                 # Main app component
├── components/            # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   └── Input.tsx
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
├── hooks/                 # Custom React hooks
│   ├── useFacilities.ts
│   └── useIssues.ts
├── lib/                   # Utilities and configurations
│   └── supabase.ts        # Supabase client setup
├── navigation/            # Navigation setup
│   ├── AppNavigator.tsx
│   └── types.ts
├── screens/               # App screens
│   ├── LoginScreen.tsx
│   ├── FacilitiesScreen.tsx
│   ├── CreateFacilityScreen.tsx
│   ├── FacilityDetailScreen.tsx
│   ├── CreateIssueScreen.tsx
│   └── IssueDetailScreen.tsx
├── supabase/              # Database schemas and migrations
│   └── schema.sql
└── types/                 # TypeScript type definitions
    └── database.ts
```

## Key Features Explained

### Authentication

The app uses Google OAuth through Supabase Auth. Users can sign in with their Google account, and the session is automatically managed with AsyncStorage for persistence.

### Facility Management

- Create new facilities with name, description, and address
- View all your facilities in a scrollable list
- Tap any facility to view details and associated issues

### Issue Tracking

- Create issues within each facility
- Set priority levels: low, medium, high, urgent
- Track status: open, in progress, resolved, closed
- Update issue status with intelligent transitions
- Delete issues when no longer needed

### Row Level Security

All data is protected with Supabase RLS policies:
- Users can only see their own facilities
- Users can only see issues from their facilities
- All operations are validated at the database level

## Development

### Adding New Features

1. Create new screens in `screens/`
2. Add navigation routes in `navigation/AppNavigator.tsx`
3. Update types in `navigation/types.ts`
4. Add database tables/policies in `supabase/schema.sql`

### Customization

- Colors: Edit the color constants in screen files
- Icons: Update emoji icons or integrate a library like `react-native-vector-icons`
- Styling: Modify StyleSheet objects in component files

## Deployment

### Expo Go (Development)

The app can be tested immediately with Expo Go:

```bash
npm start
# Scan QR code with Expo Go app
```

### Production Build

For production deployment:

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

See [Expo EAS documentation](https://docs.expo.dev/build/introduction/) for detailed instructions.

## Push Notifications

This app includes push notification support via Supabase Edge Functions. See [NOTIFICATIONS_SETUP.md](./NOTIFICATIONS_SETUP.md) for detailed setup instructions.

**Quick overview:**
1. Edge Function `send-notification` handles sending push notifications
2. Notifications are sent when new issues are created
3. Push tokens are stored in `user_push_tokens` table
4. Uses Expo Push API (free, unlimited notifications)

**Note:** Push token registration is prepared but not yet fully implemented. See NOTIFICATIONS_SETUP.md for implementation details.

## Troubleshooting

### Google OAuth not working

1. Verify your Google Cloud Console OAuth credentials
2. Check that the redirect URI is correctly configured in both Google Console and Supabase
3. Ensure the package name/bundle ID matches your configuration

### Database connection issues

1. Verify your Supabase URL and anon key in `.env`
2. Check that the database schema has been properly set up
3. Ensure RLS policies are enabled and correct

### Mobile device connection issues

**Problem**: "Failed to download remote update" or "java.io.exception" on Android/iOS

This happens when your mobile device can't reach the development server. Try these solutions:

1. **Use Tunnel Mode** (Recommended):
   ```bash
   npm run start:tunnel
   ```
   This creates a tunnel through Expo's servers, allowing your device to connect even on different networks.

2. **Ensure Same Network**:
   - Make sure your computer and mobile device are on the same Wi-Fi network
   - Check that your firewall isn't blocking port 8081
   - Try using LAN mode: `expo start --lan`

3. **Manual IP Configuration**:
   - Find your computer's local IP address (e.g., `192.168.1.100`)
   - In Expo Go, manually enter: `exp://YOUR_IP:8081`
   - Or use the connection menu in Expo Go to switch connection type

4. **Check Firewall Settings**:
   - Allow Expo/Metro bundler through your firewall
   - On Linux: `sudo ufw allow 8081/tcp`
   - On macOS/Windows: Add exception in firewall settings

### Build errors

1. Clear cache: `expo start -c`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Update Expo SDK: `expo upgrade`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

See LICENSE file for details.

## Support

For issues and questions:
- Check existing issues on GitHub
- Create a new issue with detailed description
- Review Supabase documentation: https://supabase.com/docs
- Review Expo documentation: https://docs.expo.dev

## Acknowledgments

- Built with [Expo](https://expo.dev)
- Backend powered by [Supabase](https://supabase.com)
- UI inspired by iOS design patterns
