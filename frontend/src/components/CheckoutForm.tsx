import { useEffect, useRef, useState, FormEvent } from "react";
import { checkEmail, submitCheckout } from "../api";
import OtpModal from "./OtpModal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEBOUNCE_MS = 500;

export default function CheckoutForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<{ firstName: string; lastName: string } | null>(null);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null); // email the modal was already resolved for

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emailValid = EMAIL_RE.test(email);

  // Reset the logged-in state if the person changes the email after resolving it.
  useEffect(() => {
    if (resolvedEmail && email !== resolvedEmail) {
      setUser(null);
      setResolvedEmail(null);
      setShowModal(false);
    }
  }, [email, resolvedEmail]);

  // Background recognition check, debounced, once the email looks complete.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!emailValid || resolvedEmail === email) return;

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkEmail(email);
        if (result.registered) {
          setShowModal(true);
        }
      } catch {
        // Silently ignore recognition failures; user can still check out as guest.
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, emailValid]);

  function handleLoginSuccess(firstName: string, lastName: string) {
    setUser({ firstName, lastName });
    setResolvedEmail(email);
    setShowModal(false);
  }

  function handleSkip() {
    setResolvedEmail(email);
    setShowModal(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitCheckout({
        email,
        phone,
        shippingAddress: address,
        loggedIn: !!user,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="card">
        <h1>Order recorded</h1>
        <p className="subtitle" style={{ marginBottom: 0 }}>
          Thanks{user ? `, ${user.firstName}` : ""} — your checkout details
          were saved. No payment was processed; this is a demo flow.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Checkout</h1>
      <p className="subtitle">
        Enter your details below. If we recognize your email, you can log in
        with your code — or skip and continue as a guest.
      </p>

      {user && (
        <div className="welcome-row">
          <span>
            Logged in as <strong>{user.firstName} {user.lastName}</strong>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="co-email">Email address</label>
          <input
            id="co-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          {email.length > 0 && (
            <div className={`hint ${emailValid ? "ok" : "error"}`}>
              {emailValid ? "Looks good." : "Enter a complete email address."}
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="co-phone">Phone number</label>
          <input
            id="co-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="co-address">Shipping address</label>
          <textarea
            id="co-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>
        {error && <div className="banner error">{error}</div>}
        <button
          type="submit"
          className="primary"
          disabled={!emailValid || !phone.trim() || !address.trim() || submitting}
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
      </form>

      {showModal && (
        <OtpModal email={email} onSuccess={handleLoginSuccess} onSkip={handleSkip} />
      )}
    </div>
  );
}
