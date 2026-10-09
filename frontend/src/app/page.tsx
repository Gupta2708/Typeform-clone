import type { Metadata } from "next";
import "@fontsource/dm-serif-display/latin-400.css";
import "@/components/landing/landing.css";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Better questions. Beautiful conversations.",
  description:
    "Create thoughtful forms, share a link, and make sense of every response with Typeform Builder.",
};

export default function Home() {
  return <LandingPage />;
}
