const { networkInterfaces } = require('os');

// Detect local IP address
const getLocalIp = () => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

const localIp = getLocalIp();
const BACKEND_PORT = 8787;

console.log(`[app.config] Detected local IP: ${localIp}`);
console.log(`[app.config] API URL will be: http://${localIp}:${BACKEND_PORT}`);

module.exports = {
  expo: {
    name: 'Recall People',
    slug: 'recall-people',
    version: '1.0.2',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'recall-people',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.monkeycs60.recallpeople2026',
      buildNumber: '23',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#FFFFFF',
        foregroundImage: './assets/images/android-icon-foreground.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.monkeycs60.recallpeople2026',
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
      ],
      versionCode: 5,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Recall People needs access to your photo library to let you choose profile pictures for your contacts, helping you remember and recognize them easily.',
          cameraPermission:
            "Recall People needs camera access to take photos for your contacts' profile pictures.",
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      'expo-sqlite',
      'expo-secure-store',
      [
        'expo-audio',
        {
          microphonePermission:
            'Recall People needs microphone access to record voice notes about your contacts. These recordings are transcribed to help you remember important details about the people you meet.',
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme:
            'com.googleusercontent.apps.546590152270-jsk7vkud486vg1eqsos9bt463fcbljug',
        },
      ],
      'expo-font',
      'expo-apple-authentication',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '005eaea1-73bc-47b0-80e8-5e15dee1c600',
      },
      // Dynamic API URL for dev
      localApiUrl: `http://${localIp}:${BACKEND_PORT}`,
    },
    owner: 'clement-serizay',
    runtimeVersion: '1.0.2',
    updates: {
      url: 'https://u.expo.dev/005eaea1-73bc-47b0-80e8-5e15dee1c600',
    },
  },
};
