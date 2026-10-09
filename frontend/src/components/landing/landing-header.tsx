"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronDown, Layers2, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SampleLink } from "./examples";

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 16);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", scroll);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <header className={`landing-header ${scrolled ? "scrolled" : ""}`}>
      <div className="landing-container landing-nav">
        <Link
          href="/"
          className="landing-brand"
          aria-label="Typeform Builder home"
        >
          <Layers2 size={27} strokeWidth={1.7} />
          <strong>Typeform</strong>
          <span>Builder</span>
        </Link>
        <nav className="landing-desktop-nav" aria-label="Main navigation">
          <div
            ref={menu}
            className="landing-product-menu"
            onMouseEnter={() => {
              if (hoverTimer.current) clearTimeout(hoverTimer.current);
              if (window.matchMedia("(hover: hover)").matches)
                hoverTimer.current = setTimeout(() => setOpen(true), 150);
            }}
            onMouseLeave={() => {
              if (hoverTimer.current) clearTimeout(hoverTimer.current);
              hoverTimer.current = setTimeout(() => {
                if (!menu.current?.contains(document.activeElement))
                  setOpen(false);
              }, 180);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                if (hoverTimer.current) clearTimeout(hoverTimer.current);
                setOpen(false);
                trigger.current?.focus();
              }
            }}
          >
            <button
              ref={trigger}
              aria-expanded={open}
              aria-controls="landing-product-links"
              onClick={() => {
                if (hoverTimer.current) clearTimeout(hoverTimer.current);
                setOpen(!open);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setOpen(true);
                  requestAnimationFrame(() =>
                    menu.current
                      ?.querySelector<HTMLAnchorElement>("a")
                      ?.focus(),
                  );
                }
              }}
            >
              Product <ChevronDown size={15} />
            </button>
            <div
              id="landing-product-links"
              className="landing-product-links"
              hidden={!open}
            >
              {[
                ["#build", "Build", "A space for your ideas."],
                ["#share", "Share", "One link. Any screen."],
                ["#learn", "Learn", "Every answer, clearly."],
              ].map(([href, label, text]) => (
                <a href={href} key={href} onClick={() => setOpen(false)}>
                  <span>{label}</span>
                  <small>{text}</small>
                  <ArrowUpRight size={16} />
                </a>
              ))}
            </div>
          </div>
          <a href="#examples">Examples</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="landing-nav-actions">
          <SampleLink label="Try a sample" className="landing-nav-sample" />
          <Link href="/workspace" className="landing-button light">
            Open builder <ArrowUpRight size={16} />
          </Link>
          <Modal
            open={mobile}
            onOpenChange={setMobile}
            title="Explore Typeform Builder"
            trigger={
              <button
                className="landing-mobile-trigger"
                aria-label="Open navigation"
              >
                <Menu size={23} />
              </button>
            }
          >
            <nav
              className="landing-mobile-links"
              aria-label="Mobile navigation"
            >
              {[
                ["#build", "Product"],
                ["#examples", "Examples"],
                ["#how-it-works", "How it works"],
              ].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMobile(false)}>
                  {label}
                  <ArrowUpRight size={18} />
                </a>
              ))}
              <SampleLink
                label="Try a sample"
                className="landing-mobile-sample"
              />
              <Link href="/workspace">
                Open builder <ArrowUpRight size={18} />
              </Link>
            </nav>
          </Modal>
        </div>
      </div>
    </header>
  );
}
