// functions/index.js
// Cloud Functions that send email verification via Resend
// - Auto-send on user creation (email/password)
// - Callable resend endpoint for your Verify screen

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();

// Read your Resend API key from Functions config (you already set it via CLI):
// firebase functions:config:set resend.key=RE_XXXXXXXX
const RESEND_KEY = functions.config().resend && functions.config().resend.key;

// Change these for production as needed
const CONTINUE_URL = "http://localhost:5173/login"; // must be in Authorized Domains
const APP_NAME = "Keeps";

function getResend() {
  if (!RESEND_KEY) {
    throw new Error(
      "Missing Resend API key. Set with `firebase functions:config:set resend.key=YOUR_KEY`"
    );
  }
  return new Resend(RESEND_KEY);
}

// Helper that builds the HTML body
function verifyHtml(link, displayName) {
  const hi = displayName ? `Hi ${displayName},` : "Hi,";
  return `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">Verify your email</h2>
      <p style="margin:0 0 12px">${hi} thanks for signing up to <b>${APP_NAME}</b>.</p>
      <p style="margin:0 0 16px">Click the button below to verify your email and continue:</p>
      <p style="margin:0 0 16px">
        <a href="${link}" style="display:inline-block;padding:12px 16px;border-radius:8px;background:#111;color:#fff;text-decoration:none;font-weight:600">Verify Email</a>
      </p>
      <p style="margin:0 0 8px;color:#555">If the button doesn't work, copy & paste this link:</p>
      <code style="word-break:break-all;color:#444">${link}</code>
    </div>
  `;
}

// 1) Trigger: when a Firebase Auth user is created, send a verification email via Resend
exports.sendVerifyEmailOnCreate = functions
  .region("us-central1")
  .auth.user()
  .onCreate(async (user) => {
    try {
      if (!user.email) return; // ignore phone/anon accounts

      const link = await admin.auth().generateEmailVerificationLink(user.email, {
        url: CONTINUE_URL,
        handleCodeInApp: false,
      });

      const resend = getResend();
      await resend.emails.send({
        // For dev, you can use Resend's sandbox sender. For prod, use a verified domain sender.
        from: "Keeps <onboarding@mail.resend.dev>",
        to: user.email,
        subject: `Verify your email for ${APP_NAME}`,
        html: verifyHtml(link, user.displayName || ""),
      });

      console.log("[sendVerifyEmailOnCreate] sent to", user.email);
    } catch (err) {
      console.error("[sendVerifyEmailOnCreate] failed", err);
    }
  });

// 2) Callable: resend verification email on demand from your UI
exports.resendVerification = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const email = String((data && data.email) || "").trim().toLowerCase();
    if (!email) {
      throw new functions.https.HttpsError("invalid-argument", "Email is required.");
    }

    try {
      const link = await admin.auth().generateEmailVerificationLink(email, {
        url: CONTINUE_URL,
        handleCodeInApp: false,
      });

      const resend = getResend();
      await resend.emails.send({
        from: "Keeps <onboarding@mail.resend.dev>",
        to: email,
        subject: `Verify your email for ${APP_NAME}`,
        html: verifyHtml(link, ""),
      });

      return { ok: true };
    } catch (err) {
      console.error("[resendVerification] failed", err);
      throw new functions.https.HttpsError("internal", "Failed to send verification email.");
    }
  });
