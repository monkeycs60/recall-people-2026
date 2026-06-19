/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { APP_STORE_URL } from "./Navbar";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap foot">
        <div>
          <div className="brand">
            <img
              src="/images/logo-mark.svg"
              alt=""
              width={30}
              height={30}
              style={{ borderRadius: 9 }}
            />
            Recall People
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            A personal CRM you talk to.
          </p>
        </div>
        <div className="foot-links">
          <Link href="/#how">How it works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={APP_STORE_URL} target="_blank" rel="noopener">
            App Store
          </a>
        </div>
        <p className="muted">© 2026 Recall People</p>
      </div>
    </footer>
  );
}
