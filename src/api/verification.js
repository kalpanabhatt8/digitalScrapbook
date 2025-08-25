// api/send-verification.js
// Vercel Serverless Function to generate a Firebase email verification link
// and send it via Resend. No Firebase billing required.

const admin = require("firebase-admin");
const { Resend } = require("resend");

function initAdmin() {
  if (admin.apps.length) return;
  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT; // stringified JSON from a service account key
  if (!svcJson) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env var");
  const creds = JSON.parse(svcJson);
  admin.initializeApp({ credential: admin.credential.cert(creds) });
}

function allowCors(req, res) {
  const allow = process.env.CORS_ALLOW_ORIGIN || "http://localhost:5173";
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = async (req, res) => {
  try {
    if (allowCors(req, res)) return;
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    // robust body parse
    let body = req.body;
    if (!body || typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch (_) { body = {}; }
    }

    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required" });

    initAdmin();

    const CONTINUE_URL = process.env.CONTINUE_URL || "http://localhost:5173/login";
    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: CONTINUE_URL,
      handleCodeInApp: false,
    });

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("Missing RESEND_API_KEY env var");
    const resend = new Resend(resendKey);

    const from = process.env.RESEND_FROM || "Keeps <onboarding@mail.resend.dev>";
    await resend.emails.send({
      from,
      to: email,
      subject: "Verify your email for Keeps",
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial;line-height:1.5;color:#111">
          <h2 style="margin:0 0 12px">Verify your email</h2>
          <p>Click the button below to verify your email and continue:</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 16px;border-radius:8px;background:#111;color:#fff;text-decoration:none;font-weight:600">Verify Email</a></p>
          <p style="color:#555">If the button doesn't work, copy & paste this link:</p>
          <code style="word-break:break-all;color:#444">${link}</code>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("/api/send-verification error", e);
    res.status(500).json({ error: "Failed to send verification email" });
  }
};