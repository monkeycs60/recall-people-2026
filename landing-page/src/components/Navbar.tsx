/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export const APP_STORE_URL =
  "https://apps.apple.com/fr/app/recall-people/id6757320179";

export default function Navbar() {
  return (
    <header className="site-header">
      <div className="wrap nav">
        <Link className="brand" href="/">
          <img
            src="/images/logo-mark.svg"
            alt="Recall People"
            width={44}
            height={44}
          />
          Recall People
        </Link>
        <nav className="nav-links">
          <Link href="/#how">How it works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/#data">Your data</Link>
        </nav>
        <a
          className="btn btn-mauve"
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener"
        >
          Get the app
        </a>
      </div>
    </header>
  );
}
