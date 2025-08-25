import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase"; // adjust path if yours differs

export default function EmailLoginDialog({ open, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Basic focus management
  useEffect(() => {
    if (open) setTimeout(() => {
      const el = document.getElementById("email-input");
      el?.focus();
    }, 0);
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!auth) return alert("Auth not configured");
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess?.(); // caller can navigate to /dashboard
    } catch (err) {
      console.error(err);
      alert("Login failed. Check email/password or enable Email/Password in Firebase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Login with email</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full hover:bg-black/5"
          >✕</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1" htmlFor="email-input">Email</label>
            <input
              id="email-input"
              className="w-full rounded-lg border px-3 py-2"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="password-input">Password</label>
            <input
              id="password-input"
              className="w-full rounded-lg border px-3 py-2"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-full border">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-4 rounded-full text-white bg-violet-600 disabled:opacity-60"
            >
              {loading ? "Logging in…" : "Login"}
            </button>
          </div>
        </form>

        {/* v2: add “Forgot password?” and “Create account” links here */}
      </div>
    </div>
  );
}