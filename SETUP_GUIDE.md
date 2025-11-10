# Detailed Setup Guide

This guide walks you through setting up the Facility Manager app from scratch, including Supabase configuration and Google OAuth setup.

## Table of Contents

1. [Supabase Setup](#supabase-setup)
2. [Google OAuth Configuration](#google-oauth-configuration)
3. [Database Schema Setup](#database-schema-setup)
4. [Environment Configuration](#environment-configuration)
5. [Testing the App](#testing-the-app)

## Supabase Setup

### Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign up/sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: Facility Manager (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select the closest region to your users
   - **Pricing Plan**: Free tier is sufficient for development
4. Click "Create new project"
5. Wait 2-3 minutes for the project to be provisioned

### Step 2: Get API Credentials

1. In your Supabase project dashboard, click "Project Settings" (gear icon)
2. Navigate to "API" section
3. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")
4. Keep these values handy for the next steps

## Google OAuth Configuration

### Step 1: Create Google Cloud Console Project

1. Go to https://console.cloud.google.com
2. Click "Select a project" → "New Project"
3. Enter project name: "Facility Manager"
4. Click "Create"
5. Wait for the project to be created (check notification bell)

### Step 2: Configure OAuth Consent Screen

1. In Google Cloud Console, open the navigation menu (☰)
2. Go to "APIs & Services" → "OAuth consent screen"
3. Select "External" user type
4. Click "Create"
5. Fill in the required fields:
   - **App name**: Facility Manager
   - **User support email**: Your email
   - **Developer contact information**: Your email
6. Click "Save and Continue"
7. On "Scopes" screen, click "Add or Remove Scopes"
8. Select these scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
9. Click "Update" → "Save and Continue"
10. On "Test users" screen, add your email for testing
11. Click "Save and Continue"
12. Review and click "Back to Dashboard"

### Step 3: Create OAuth Credentials

1. In Google Cloud Console, go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Name it "Facility Manager Web"
5. Under "Authorized redirect URIs", click "Add URI"
6. Add this URI (replace YOUR_PROJECT_REF with your Supabase project reference):
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   - Find YOUR_PROJECT_REF in your Supabase project URL
   - Example: If your URL is `https://abcdefghijklmnop.supabase.co`,
     then YOUR_PROJECT_REF is `abcdefghijklmnop`
7. Click "Create"
8. **Save the Client ID and Client Secret** (you'll need these next)

### Step 4: Configure Supabase Auth

1. Go back to your Supabase project dashboard
2. Navigate to "Authentication" → "Providers"
3. Find "Google" in the list and click on it
4. Enable the Google provider
5. Enter the credentials from Step 3:
   - **Client ID**: Paste the Google Client ID
   - **Client Secret**: Paste the Google Client Secret
6. Click "Save"

### Step 5: Configure Deep Linking (Mobile)

#### For iOS (if deploying to iOS):

1. In Google Cloud Console credentials, create another OAuth client ID
2. Select "iOS" application type
3. Enter your Bundle ID: `com.yourcompany.facilitymanager`
4. Click "Create"
5. Add the iOS client ID to your app configuration if needed

#### For Android (if deploying to Android):

1. In Google Cloud Console credentials, create another OAuth client ID
2. Select "Android" application type
3. Enter your Package name: `com.yourcompany.facilitymanager`
4. Get your SHA-1 certificate fingerprint:
   ```bash
   # Development keystore
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
5. Paste the SHA-1 fingerprint
6. Click "Create"

## Database Schema Setup

### Step 1: Open SQL Editor

1. In Supabase dashboard, navigate to "SQL Editor"
2. Click "New query"

### Step 2: Run Schema Script

1. Open the `supabase/schema.sql` file in your project
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. Wait for "Success. No rows returned" message

### Step 3: Verify Tables

1. Navigate to "Table Editor" in Supabase dashboard
2. You should see two tables:
   - `facilities`
   - `issues`
3. Click on each table to verify the structure

### Step 4: Verify RLS Policies

1. In Table Editor, click on "facilities" table
2. Click on the "RLS" icon (shield icon)
3. You should see policies listed:
   - Users can view their own facilities
   - Users can create their own facilities
   - Users can update their own facilities
   - Users can delete their own facilities
4. Repeat for "issues" table

## Environment Configuration

### Step 1: Create .env File

1. In the project root, copy the example file:
   ```bash
   cp .env.example .env
   ```

### Step 2: Add Supabase Credentials

1. Open `.env` file
2. Replace the placeholder values:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```
3. Save the file

### Step 3: Verify Configuration

The app is now configured! The Google OAuth credentials are stored in Supabase, not in the app code.

## Testing the App

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start the Development Server

```bash
npm start
```

### Step 3: Open in Expo Go

1. Install Expo Go on your mobile device:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
2. Scan the QR code from the terminal with your device camera
3. The app should open in Expo Go

### Step 4: Test Authentication

**Note**: Google OAuth in development mode has limitations:
- Web: Works perfectly
- iOS Simulator: May not work (requires native build)
- Android Emulator: May not work (requires native build)
- Expo Go: Limited OAuth support

**Recommended Testing Approach**:

1. **For Development**: Test on web first
   ```bash
   npm run web
   ```
2. **For Mobile Testing**: Build a development client
   ```bash
   npx expo install expo-dev-client
   npx expo run:ios  # or run:android
   ```

### Step 5: Test Core Features

Once authenticated:

1. **Create a Facility**:
   - Tap "Create Facility"
   - Fill in name, description, and address
   - Tap "Create Facility"
   - Verify it appears in the list

2. **View Facility Details**:
   - Tap on a facility
   - Verify facility information displays

3. **Create an Issue**:
   - From facility details, tap "Create Issue"
   - Fill in title and description
   - Select priority and status
   - Tap "Create Issue"
   - Verify it appears in the issues list

4. **Update Issue Status**:
   - Tap on an issue
   - Tap a status change button
   - Verify status updates

5. **Delete an Issue**:
   - From issue details, tap "Delete Issue"
   - Confirm deletion
   - Verify it's removed from the list

## Troubleshooting

### Google OAuth Issues

**Problem**: "Error 400: redirect_uri_mismatch"
**Solution**:
- Verify the redirect URI in Google Console matches exactly: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Check for typos, trailing slashes, or http vs https

**Problem**: OAuth doesn't work in Expo Go
**Solution**:
- This is expected. Use web for testing or create a development build
- See: https://docs.expo.dev/guides/authentication/#google

### Database Issues

**Problem**: "Cannot read from table"
**Solution**:
- Verify RLS policies are properly set up
- Check that you're authenticated (signed in)
- Ensure the user_id in the policies matches your auth.uid()

**Problem**: Tables don't exist
**Solution**:
- Re-run the schema.sql script in Supabase SQL Editor
- Check for any error messages during execution

### Connection Issues

**Problem**: "Failed to fetch"
**Solution**:
- Verify EXPO_PUBLIC_SUPABASE_URL is correct
- Verify EXPO_PUBLIC_SUPABASE_ANON_KEY is correct
- Check your internet connection
- Restart the Expo development server

## Next Steps

Now that your app is set up and running:

1. **Customize the Design**: Modify colors, fonts, and layouts in the screen files
2. **Add More Features**:
   - Image uploads for issues
   - Comments/notes on issues
   - User assignments
   - Push notifications
3. **Deploy**: Build production versions for iOS and Android using EAS Build
4. **Monitor**: Set up error tracking and analytics

For more information, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Expo Documentation](https://docs.expo.dev)
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started)

## Support

If you encounter issues not covered here:
1. Check the main README.md
2. Search existing issues on GitHub
3. Create a new issue with detailed information
