#!/bin/sh
# Lokal iOS-release: bump build-nummer → byg www → archive → eksportér IPA → upload til TestFlight.
# Kør: npm run ios:release
#
# Forudsætninger (engangs):
#   - Apple ID logget ind i Xcode (team 7HP79DYM29)
#   - API-nøgle .p8 i ~/.appstoreconnect/private_keys/ (auto-findes). Backup i 1Password (Alfanova-vault).
# Key ID + Issuer ID er identifikatorer (ikke hemmeligheder) — kan overstyres via env.
set -e

KEY_ID="${ASC_KEY_ID:-7KJMNBJ9PK}"
ISSUER_ID="${ASC_ISSUER_ID:-ff1439a3-2ab5-4187-b864-afff41d7c793}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="/opt/homebrew/bin:$PATH"

PBX="ios/App/App.xcodeproj/project.pbxproj"
CUR=$(grep -m1 'CURRENT_PROJECT_VERSION = ' "$PBX" | sed -E 's/.*= ([0-9]+);/\1/')
NEXT=$((CUR + 1))
sed -i '' -E "s/CURRENT_PROJECT_VERSION = [0-9]+;/CURRENT_PROJECT_VERSION = $NEXT;/g" "$PBX"
echo "=== build-nummer: $CUR → $NEXT (husk at committe pbxproj) ==="

echo "=== 1/4 byg www + sync ==="
npm run cap:sync

echo "=== 2/4 archive ==="
rm -rf /tmp/istoedet.xcarchive
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/istoedet.xcarchive \
  -allowProvisioningUpdates archive

echo "=== 3/4 eksportér IPA ==="
rm -rf /tmp/istoedet-export
xcodebuild -exportArchive -archivePath /tmp/istoedet.xcarchive \
  -exportPath /tmp/istoedet-export \
  -exportOptionsPlist scripts/ios-export-options.plist \
  -allowProvisioningUpdates

echo "=== 4/4 upload til App Store Connect ==="
xcrun altool --upload-app -t ios -f /tmp/istoedet-export/App.ipa \
  --apiKey "$KEY_ID" --apiIssuer "$ISSUER_ID"

echo "=== færdig — build ($NEXT) er på vej til TestFlight ==="
