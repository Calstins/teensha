// routes/redirectRoutes.js
// Serves lightweight HTML "bridge" pages for links that are opened from
// email on a phone. Email clients (Gmail on Android especially) will not
// follow a custom URL scheme like teenshapers:// directly, so these
// https:// pages exist purely to redirect the user into the app.
import express from 'express';

const router = express.Router();

// GET /reset-password?token=...
router.get('/reset-password', (req, res) => {
  const { token } = req.query;

  // helmet() applies a default Content-Security-Policy that blocks inline
  // <script> tags. This page needs an inline script to auto-redirect into
  // the app, so relax CSP for this response only.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!token) {
    return res.status(400).send(renderBridgePage({
      deepLink: null,
      title: 'Invalid Reset Link',
      message: 'This password reset link is missing its token. Please request a new one from the TeenShapers app.',
    }));
  }

  const deepLink = `teenshapers://reset-password?token=${encodeURIComponent(token)}`;

  res.send(renderBridgePage({
    deepLink,
    title: 'Opening TeenShapers…',
    message: "If the app doesn't open automatically in a few seconds, tap the button below.",
  }));
});

function renderBridgePage({ deepLink, title, message }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TeenShapers - Password Reset</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #FFF7F3;
            color: #1F2937;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: #ffffff;
            border-radius: 16px;
            padding: 32px 24px;
            max-width: 420px;
            width: calc(100% - 48px);
            text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          }
          h1 {
            font-size: 20px;
            margin: 0 0 12px;
            color: #FF6B35;
          }
          p {
            font-size: 15px;
            line-height: 1.5;
            color: #4B5563;
            margin: 0 0 24px;
          }
          .button {
            display: inline-block;
            background: #FF6B35;
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 600;
            padding: 14px 28px;
            border-radius: 10px;
            font-size: 16px;
          }
          .hint {
            margin-top: 20px;
            font-size: 13px;
            color: #9CA3AF;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${title}</h1>
          <p>${message}</p>
          ${deepLink
            ? `<a class="button" href="${deepLink}" id="open-app-btn">Open TeenShapers App</a>
               <p class="hint">Don't have the app installed? Install TeenShapers first, then request a new reset link from the Forgot Password screen.</p>`
            : ''
          }
        </div>
        ${deepLink
          ? `<script>
               // Attempt the redirect automatically. This works in mobile
               // browsers (Safari/Chrome) even though it does NOT work when
               // tapped directly inside most email apps - which is exactly
               // why this bridge page exists.
               window.location.href = ${JSON.stringify(deepLink)};
             </script>`
          : ''
        }
      </body>
    </html>
  `;
}

export default router;
