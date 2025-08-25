# GoGoGoGo - Setup Instructions

Complete setup guide for running the fidget spinner game locally.

## 🔧 Prerequisites

### Required Software
1. **Node.js** (18.0.0 or higher)
   ```bash
   # Check version
   node --version
   
   # Install from https://nodejs.org/
   ```

2. **Expo CLI**
   ```bash
   npm install -g @expo/cli
   ```

3. **Platform-Specific Tools**

   **For iOS Development (macOS only):**
   - Xcode 12+ 
   - iOS Simulator
   ```bash
   # Install via App Store
   # Open Xcode -> Preferences -> Components -> Install iOS simulators
   ```

   **For Android Development:**
   - Android Studio
   - Android Emulator (API level 21+)
   ```bash
   # Download from https://developer.android.com/studio
   # Create virtual device via AVD Manager
   ```

## 📥 Installation Steps

### 1. Clone Repository
```bash
# Clone the project
git clone <repository-url>
cd spin.io

# Or if starting fresh
mkdir gogogogogo-game
cd gogogogogo-game
```

### 2. Install Dependencies
```bash
# Install all npm packages
npm install

# Verify installation
npm ls --depth=0
```

### 3. Configure Environment

**Create environment config (optional):**
```bash
# Create .env file for custom settings
echo "EXPO_PUBLIC_API_URL=https://your-api.com" > .env
```

**RevenueCat Setup:**
1. Sign up at [RevenueCat](https://app.revenuecat.com)
2. Create a new project
3. Get API keys for iOS/Android
4. Update `src/utils/purchases.ts`:
   ```typescript
   const API_KEYS = {
     ios: 'your_real_ios_api_key',
     android: 'your_real_android_api_key',
   };
   ```

### 4. Verify Setup
```bash
# Check TypeScript compilation
npm run typecheck

# Run tests to ensure everything works
npm test

# Start development server (should open without errors)
npm start
```

## 🚀 Running the Game

### Development Mode
```bash
# Start Expo development server
npm start

# Alternative commands
npx expo start
npx expo start --clear  # Clear cache if needed
```

### Platform-Specific Launch

**iOS (macOS only):**
```bash
# Launch in iOS Simulator  
npm run ios
# or
npx expo start --ios
```

**Android:**
```bash
# Launch in Android Emulator
npm run android  
# or
npx expo start --android
```

**Web:**
```bash
# Launch in web browser
npm run web
# or  
npx expo start --web
```

### Physical Device Testing

**iOS Device:**
1. Install "Expo Go" app from App Store
2. Scan QR code from terminal/browser
3. Game will load in Expo Go

**Android Device:**
1. Install "Expo Go" app from Play Store
2. Scan QR code or open link
3. Game will load in Expo Go

## 🧪 Testing & Quality Assurance

### Run Tests
```bash
# Run all unit tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Quality Checks
```bash
# TypeScript type checking
npm run typecheck

# ESLint code linting
npm run lint

# Fix auto-fixable lint issues
npm run lint:fix

# Format code with Prettier
npx prettier --write .
```

## 🏗️ Building for Production

### Expo Build Service (EAS)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo account
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android  
eas build --platform android

# Build for web
npx expo build:web
```

### Local Builds
```bash
# iOS (requires macOS + Xcode)
npx expo run:ios --configuration Release

# Android  
npx expo run:android --variant release

# Web build
npx expo export:web
```

## 🐛 Troubleshooting

### Common Issues & Solutions

**1. Metro Bundler Cache Issues**
```bash
npx expo start --clear
rm -rf node_modules package-lock.json
npm install
```

**2. iOS Build Errors**
```bash
cd ios
pod install --repo-update
cd ..
npx expo run:ios
```

**3. Android Emulator Not Starting**
```bash
# Check Android SDK/emulator installation
$ANDROID_HOME/emulator/emulator -list-avds
$ANDROID_HOME/emulator/emulator @your_avd_name
```

**4. TypeScript Errors**
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm run typecheck
```

**5. React Native SVG Issues**
```bash
# Reinstall SVG package
npm uninstall react-native-svg
npm install react-native-svg
npx expo install --fix
```

### Platform-Specific Troubleshooting

**iOS:**
- Ensure iOS Simulator is running (iOS 13.0+)
- Check Xcode command line tools: `xcode-select --install`
- Verify iOS deployment target matches app.json

**Android:**  
- Verify Android SDK path in environment variables
- Check emulator has API level 21+ (Android 5.0+)
- Enable hardware acceleration in AVD settings

**Web:**
- Clear browser cache and local storage
- Check console for JavaScript errors
- Ensure web-compatible dependencies

## ⚙️ Configuration Options

### Game Settings
Edit `src/types/index.ts` to modify game parameters:
```typescript
export const GAME_CONFIG = {
  ARENA_WIDTH: 1000,        // Game area size
  SPINNER_INITIAL_SIZE: 15, // Starting size
  DOT_COUNT: 35,            // Dots on screen
  TARGET_FPS: 60,           // Frame rate
};
```

### Visual Customization
Update colors in `COLORS` constant:
```typescript
export const COLORS = {
  BACKGROUND: '#000000',    // Arena background
  SPINNER: '#00FF88',       // Player color
  DOT: '#FFD700',          // Collectible color
};
```

### Development Settings
Create `expo-constants` config for development:
```typescript
// app.config.js
export default {
  expo: {
    extra: {
      isDev: __DEV__,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  },
};
```

## 📁 Project Structure Overview
```
spin.io/
├── src/
│   ├── components/       # React components
│   ├── features/game/    # Game logic
│   ├── hooks/           # Custom hooks
│   ├── types/           # TypeScript types  
│   ├── utils/           # Utility functions
│   └── __tests__/       # Unit tests
├── docs/                # Documentation
├── App.tsx             # Main app component
├── package.json        # Dependencies & scripts
└── README.md           # Project overview
```

## 🎯 Next Steps

After successful setup:

1. **Explore the Code**: Start with `App.tsx` and follow the component tree
2. **Make Changes**: Modify game constants and see immediate results
3. **Add Features**: Use the existing architecture to add new mechanics
4. **Test Changes**: Run tests after modifications
5. **Deploy**: Use EAS Build for app store deployment

## 💡 Development Tips

- **Hot Reload**: Changes reflect automatically in development
- **Debugging**: Use React DevTools and console.log for debugging  
- **Performance**: Monitor frame rate in game loop
- **Testing**: Write tests for new features before implementation

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Create new issue with reproduction steps
4. Include system info and error logs

---

**Happy Development! 🎮**