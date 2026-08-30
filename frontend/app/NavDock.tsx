"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "#experience", label: "Experience" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#why-us", label: "Why us" },
  { href: "#demo", label: "Live demo" },
  { href: "#create", label: "Create a lesson" },
];

export function NavDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [localTime, setLocalTime] = useState("--:--:--");

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
    const updateClock = () => setLocalTime(formatter.format(new Date()));

    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className={`nav-dock${isOpen ? " is-open" : ""}`} aria-label="Ocular navigation">
      <svg className="nav-dock-shape" viewBox="0 0 1120 84" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="dock-shape-main"
          d="M0 0H1120C1082 0 1054 4 1032 18C1008 34 986 54 960 70C944 80 922 84 894 84H226C198 84 176 80 160 70C134 54 112 34 88 18C66 4 38 0 0 0Z"
        />
      </svg>

      <div className="nav-dock-content">
        <a className="dock-brand" href="#top" onClick={closeMenu} aria-label="Ocular home">
          Ocular
        </a>

        <time className="dock-time" aria-label={`Your local time is ${localTime}`}>
          {localTime}
        </time>

        <div className="dock-links" id="dock-navigation" aria-hidden={!isOpen}>
          {links.map((link, index) => (
            <a
              href={link.href}
              key={link.href}
              onClick={closeMenu}
              style={{ "--link-index": index } as React.CSSProperties}
              tabIndex={isOpen ? 0 : -1}
            >
              <span className="dock-link-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{link.label}</span>
            </a>
          ))}
        </div>

        <button
          className="hamburger-button"
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="dock-navigation"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="hamburger-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
      </div>
    </nav>
  );
}
