import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "SentinelOS-Lite",
  description: "Self-healing security stack"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <div>
              <h1>SentinelOS-Lite</h1>
              <p>Self-healing security stack</p>
            </div>
            <nav className="nav">
              <Link href="/">Overview</Link>
              <Link href="/services">Services</Link>
              <Link href="/anomalies">Anomalies</Link>
              <Link href="/rules">Rules</Link>
              <Link href="/actions">Actions</Link>
            </nav>
          </header>
          {children}
          <footer className="footer">
            <p>Credit: Ram Sunil Gawas</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
