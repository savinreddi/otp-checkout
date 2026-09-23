import { useState } from "react";
import RegistrationForm from "./components/RegistrationForm";
import CheckoutForm from "./components/CheckoutForm";

type View = "register" | "checkout";

export default function App() {
  const [view, setView] = useState<View>("register");

  return (
    <div className="shell">
      <nav className="nav">
        <button
          className={view === "register" ? "active" : ""}
          onClick={() => setView("register")}
        >
          Register
        </button>
        <button
          className={view === "checkout" ? "active" : ""}
          onClick={() => setView("checkout")}
        >
          Checkout
        </button>
      </nav>
      {view === "register" ? <RegistrationForm /> : <CheckoutForm />}
    </div>
  );
}
