#!/bin/bash

# Load production env variables
export $(cat .env.production | xargs)

# Build Android APK locally (no EAS quota used)
eas build --platform android --profile local-android --local

echo "✅ Build complete! APK is in the current directory."
