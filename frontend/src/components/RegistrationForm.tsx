import { useState, FormEvent } from "react";
import { registerUser } from "../api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistrationForm() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = EMAIL_RE.test(email) && firstName.trim() && lastName.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await registerUser({ email, firstName, lastName });
      setCode(result.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (code) {
    return (
      <div className="card">
        <h1>You're registered</h1>
        <p className="subtitle">
          Save this code. You'll enter it at checkout to log in as {firstName}.
        </p>
        <div className="code-display">{code}</div>
        <p className="subtitle" style={{ marginBottom: 0 }}>
          Head to the Checkout tab and start typing your email — we'll
          recognize you automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Create an account</h1>
      <p className="subtitle">
        Register once, then use your code to skip re-entering your details at
        checkout.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="reg-email">Email address</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="reg-first">First name</label>
          <input
            id="reg-first"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="reg-last">Last name</label>
          <input
            id="reg-last"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        {error && <div className="banner error">{error}</div>}
        <button type="submit" className="primary" disabled={!canSubmit || submitting}>
          {submitting ? "Registering…" : "Register"}
        </button>
      </form>
    </div>
  );
}
