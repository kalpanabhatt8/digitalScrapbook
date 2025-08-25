import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../firebase"; // keep this path consistent with your project
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { IconBrandGoogleFilled, IconMail, IconRepeat } from "@tabler/icons-react";

export default function AuthPage() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const mode = useMemo(() => (pathname.includes("login") ? "login" : "signup"), [pathname]);

  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verifyScreen, setVerifyScreen] = useState(false);

  const actionCodeSettings = {
    url: `${window.location.origin}/login`, // after verify, send them back to login
    handleCodeInApp: false,
  };

  // DEV ONLY: set VITE_ALLOW_UNVERIFIED_LOGIN=true in .env.local to bypass verification while developing.
  // Never enable this in production.

  const emailNorm = (email || "").trim().toLowerCase();

  const handleGoogle = async () => {
    if (!auth) return alert("Auth not configured");
    try {
      setBusy(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const res = await signInWithPopup(auth, provider);
      if (res?.user) nav("/dashboard", { replace: true });
    } catch (err) {
      const code = err?.code || "";
      if (["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/popup-blocked"].includes(code)) return;
      console.error(err);
      alert(err?.message || "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!auth) return alert("Auth not configured");
    if (!emailNorm) return setError("Please enter your email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    try {
      setBusy(true);
      const { user } = await createUserWithEmailAndPassword(auth, emailNorm, password);
      try {
        // Send verification ONLY on signup
        await sendEmailVerification(user, actionCodeSettings);
        setVerifyScreen(true);
        setNotice("We sent a verification email. Please verify your email, then log in.");
      } catch (e) {
        console.warn("sendEmailVerification failed", e);
        setVerifyScreen(true);
        setError("Could not send verification email. Check your Authorized domains and Project support email in Firebase Console.");
      }
      await signOut(auth);
    } catch (err) {
      console.error("Signup failed", err);
      const code = err?.code || "";
      const map = {
        "auth/email-already-in-use": "That email is already registered. Try logging in.",
        "auth/invalid-email": "That email looks invalid.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/operation-not-allowed": "Email/Password is disabled for this project. Enable it in Firebase → Authentication → Sign-in method.",
      };
      setError(map[code] || "Sign up failed. Try a different email or password.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!auth) return alert("Auth not configured");
    if (!emailNorm) return setError("Please enter your email.");

    try {
      setBusy(true);
      const { user } = await signInWithEmailAndPassword(auth, emailNorm, password);

      // If not verified, block login (do NOT send here). Let user use Verify screen to resend manually.
      if (!user.emailVerified) {
        const allowDevBypass = import.meta.env.VITE_ALLOW_UNVERIFIED_LOGIN === 'true' && import.meta.env.DEV;
        if (allowDevBypass) {
          setNotice("[DEV] Email not verified, but bypass is enabled. Disable VITE_ALLOW_UNVERIFIED_LOGIN for prod.");
          nav("/dashboard", { replace: true });
          return;
        }
        setVerifyScreen(true);
        setError("Your email isn’t verified. Click ‘Resend verification’. Then check your inbox/spam and use ‘I verified—continue’.");
        await signOut(auth);
        return;
      }

      nav("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login failed", err);
      const code = err?.code || "";
      const map = {
        "auth/user-not-found": "No account found for that email. Create an account first.",
        "auth/wrong-password": "Incorrect password. Try again.",
        "auth/invalid-email": "That email looks invalid.",
        "auth/too-many-requests": "Too many attempts. Please wait and try again.",
        "auth/invalid-credential": "This email may be registered with a different sign-in method (e.g., Google). Try that method.",
      };
      setError(map[code] || "Login failed. Check email/password.");
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    setError("");
    setNotice("");
    if (!auth) return;
    if (!emailNorm) return setError("Enter your email above, then click Resend.");

    try {
      setBusy(true);
      // We need a user instance to call sendEmailVerification; sign in then immediately sign out.
      const { user } = await signInWithEmailAndPassword(auth, emailNorm, password);
      try {
        await sendEmailVerification(user, actionCodeSettings);
        setNotice("Verification email re-sent. Check your inbox (and spam).");
      } catch (e) {
        console.warn("sendEmailVerification failed", e);
        setError("Could not resend verification email. Check your Authorized domains and Project support email.");
      }
      await signOut(auth);
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/user-not-found") setError("No account found for that email. Create an account first.");
      else if (code === "auth/wrong-password") setError("Password incorrect. Enter the same password you used when signing up.");
      else setError("Could not resend verification email. Try again later.");
    } finally {
      setBusy(false);
    }
  };

  console.log("[firebase] project:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
  console.log("[firebase] authDomain:", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);

  // --- UI ---
  const Form = (
    <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-3">
      <div>
        <label className="block text-sm mb-1 text-left" htmlFor="email-input">Email</label>
        <input
          id="email-input"
          type="email"
          className="w-full rounded-lg border px-3 py-2"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label className="block text-sm mb-1 text-left" htmlFor="password-input">Password</label>
        <input
          id="password-input"
          type="password"
          className="w-full rounded-lg border px-3 py-2"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {notice && <div className="text-sm text-emerald-700">{notice}</div>}

      <button
        type="submit"
        disabled={busy}
        className="w-full h-11 rounded-xl text-[15px] font-medium text-white bg-black hover:bg-black/90 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        <IconMail size={18} />
        {busy ? (mode === "signup" ? "Creating…" : "Logging in…") : (mode === "signup" ? "Create account" : "Continue")}
      </button>

      {mode === "login" && (
        <div className="text-sm text-black/60">
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={async () => {
              setError("");
              if (!emailNorm) { setError("Enter your email above, then click Forgot password."); return; }
              try { await sendPasswordResetEmail(auth, emailNorm); setNotice("Password reset email sent. Check your inbox."); }
              catch (e) {
                const c = e?.code || "";
                setError(c === "auth/user-not-found" ? "No account found for that email." : "Could not send reset email. Try again later.");
              }
            }}
          >
            Forgot password?
          </button>
        </div>
      )}
    </form>
  );

  const VerifyScreen = (
    <div>
      <h2 className="text-xl font-semibold mb-2">Verify your email</h2>
      <p className="text-sm text-black/70 mb-4">We send verification <b>after signup</b>. If you didn’t receive it, click <b>Resend verification</b> below, then open the link in your inbox (check Spam/Promotions). After verifying, click <b>I verified—continue</b>.</p>
      <div className="flex gap-3 mb-4 text-sm">
        <a className="underline" href="https://mail.google.com/" target="_blank" rel="noreferrer">Open Gmail</a>
        <button className="underline" onClick={() => nav('/login')}>Back to login</button>
      </div>
      {notice && <div className="text-sm text-emerald-700 mb-2">{notice}</div>}
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <div className="flex items-center gap-2">
        <button onClick={resendVerification} disabled={busy} className="h-10 px-4 rounded-lg border flex items-center gap-2">
          <IconRepeat size={16} /> Resend verification
        </button>
        <button onClick={() => setVerifyScreen(false)} className="h-10 px-4 rounded-lg">Back</button>
        <button
          onClick={async () => {
            setError(""); setNotice("");
            try {
              setBusy(true);
              const { user } = await signInWithEmailAndPassword(auth, emailNorm, password);
              if (user.emailVerified) {
                nav("/dashboard", { replace: true });
              } else {
                setError("Still not verified. Check your inbox or click Resend.");
              }
              await signOut(auth);
            } catch (e) {
              console.error("Recheck verification failed", e);
              setError("Could not check verification. Try again.");
            } finally {
              setBusy(false);
            }
          }}
          className="h-10 px-4 rounded-lg border"
        >
          I verified—continue
        </button>
      </div>
    </div>
  );

  return (
    <section className="fixed inset-0 bg-white">
      <div className="h-full w-full grid grid-cols-1 lg:grid-cols-2">
        {/* Left pane (auth) */}
        <div className="h-full w-full flex justify-center items-center">
          <div className="w-full max-w-[420px] self-center px-6">
            <h1 className="mt-6 text-[34px] sm:text-[38px] leading-[1.15] text-black/90" style={{ fontFamily: '"Margarine", ui-sans-serif, system-ui' }}>
              {mode === "login" ? "Welcome back." : "Create your account"}
            </h1>

            <div className="mt-8 space-y-3" style={{ fontFamily: '"Quicksand", ui-sans-serif, system-ui' }}>
              {!verifyScreen ? (
                <>
                  <button
                    onClick={handleGoogle}
                    disabled={busy}
                    className="w-full h-11 rounded-xl border border-black/20 bg-white hover:bg-black/5 text-[15px] font-medium disabled:opacity-60 flex justify-center items-center gap-2"
                  >
                    <IconBrandGoogleFilled size={18} /> Continue with Google
                  </button>

                  <div className="flex items-center gap-3 py-1">
                    <div className="h-[1px] flex-1 bg-black/10" />
                    <span className="text-xs text-black/50 font-medium">OR</span>
                    <div className="h-[1px] flex-1 bg-black/10" />
                  </div>

                  {Form}

                  <div className="mt-4 text-sm text-black/60">
                    {mode === "login" ? (
                      <>
                        New here?{' '}
                        <button className="underline underline-offset-4" onClick={() => nav('/signup')}>Create an account</button>
                      </>
                    ) : (
                      <>
                        Already have an account?{' '}
                        <button className="underline underline-offset-4" onClick={() => nav('/login')}>Log in</button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                VerifyScreen
              )}
            </div>
          </div>
        </div>

        {/* Right pane (simple decorative block for v1) */}
        <div className="hidden lg:block h-full w-full p-12">
          <div className="w-full h-full rounded-3xl bg-gradient-to-b from-rose-100 via-indigo-100 to-rose-200" />
        </div>
      </div>
    </section>
  );
}
