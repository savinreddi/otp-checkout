import { useState, FormEvent } from "react";
import { loginWithCode } from "../api";

interface Props {
  email: string;
  onSuccess: (firstName: string, lastName: string) => void;
  onSkip: () => void;
}

export default function OtpModal({ email, onSuccess, onSkip }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    setError(null);
    try {
      const result = await loginWithCode(email, code);
      if (result.success && result.firstName && result.lastName) {
        onSuccess(result.firstName, result.lastName);
      } else {
        setError(result.message || "That code doesn't match. Try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Welcome back</h2>
        <p className="desc">
          We found an account for {email}. Enter the code you were given at
          registration to log in.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="otp-code">6-digit code</label>
            <input
              id="otp-code"
              className="code-input"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </div>
          {error && <div className="banner error">{error}</div>}
          <div className="modal-actions">
            <button
              type="submit"
              className="primary"
              disabled={code.length !== 6 || checking}
            >
              {checking ? "Checking…" : "Log in"}
            </button>
            <div className="skip">
              <button type="button" className="text-link" onClick={onSkip}>
                Skip and continue as guest
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
