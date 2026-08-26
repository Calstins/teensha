// routes/wellKnownRoutes.js
// Serves the two verification files that let iOS and Android treat
// https://teensha.vercel.app/reset-password as belonging to the
// TeenShapers app (Universal Links / App Links). Once verified, tapping
// the link - even from inside Gmail/Outlook - opens the app directly,
// with NO browser page shown at all.
//
// ⚠️ Fill in the two placeholders below before deploying, then rebuild
// the app with EAS (these only take effect in a native build, not an
// OTA/JS update):
//   1. APPLE_TEAM_ID  - Apple Developer account > Membership, or
//                        `eas credentials` (iOS)
//   2. ANDROID_SHA256  - `eas credentials` (Android > Keystore), or
//                        Google Play Console > App integrity > App
//                        signing key certificate
import express from 'express';

const router = express.Router();

const APPLE_TEAM_ID = 'REPLACE_WITH_APPLE_TEAM_ID';
const IOS_BUNDLE_ID = 'com.calstech.teenshapers';
const ANDROID_PACKAGE = 'com.calstech.teenshapers';
const ANDROID_SHA256 = 'REPLACE_WITH_ANDROID_SHA256_CERT_FINGERPRINT';

const appleAppSiteAssociation = {
  applinks: {
    apps: [],
    details: [
      {
        appID: `${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`,
        appIDs: [`${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`],
        paths: ['/reset-password', '/reset-password?*'],
      },
    ],
  },
};

const assetLinks = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: ANDROID_PACKAGE,
      sha256_cert_fingerprints: [ANDROID_SHA256],
    },
  },
];

// iOS looks for this at /.well-known/apple-app-site-association
// (and some older iOS versions also check the root path as a fallback,
// so both are served below).
function sendAasa(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.json(appleAppSiteAssociation);
}
router.get('/.well-known/apple-app-site-association', sendAasa);
router.get('/apple-app-site-association', sendAasa);

// Android looks for this at /.well-known/assetlinks.json
router.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(assetLinks);
});

export default router;
