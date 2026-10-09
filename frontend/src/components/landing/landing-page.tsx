import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  GripVertical,
  Layers2,
  Link2,
  List,
  Star,
} from "lucide-react";
import { LandingHeader } from "./landing-header";
import { ExampleCarousel, SampleLink } from "./examples";
import { HeroDemo, Reveal, TypeShowcase } from "./motion";
import { BuilderDemo, PlayerDemo, ResultsDemo } from "./product-demos";

function BuilderLink({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/workspace"
      className={`landing-button ${light ? "light" : "dark"}`}
    >
      Open builder <ArrowUpRight size={18} />
    </Link>
  );
}

const features = [
  {
    label: "BUILD",
    title: "Make it your own.",
    text: "Eight ways to ask. A little room to play. Make every question feel like you.",
    href: "#build",
    visual: "build",
  },
  {
    label: "SHARE",
    title: "One link. A real connection.",
    text: "Give every question its moment, on any screen. All it takes is a link.",
    href: "#share",
    visual: "share",
  },
  {
    label: "LEARN",
    title: "Every answer, clearly.",
    text: "Go beyond a list of responses. Find the details that make a difference.",
    href: "#learn",
    visual: "learn",
  },
];

export function LandingPage() {
  return (
    <div className="landing">
      <LandingHeader />
      <main id="main-content">
        <section className="landing-hero" aria-labelledby="hero-heading">
          <div className="hero-copy landing-container">
            <p className="landing-eyebrow">
              FORMS THAT FEEL LIKE A CONVERSATION
            </p>
            <h1 id="hero-heading">
              Better questions.
              <br />
              <span>Beautiful conversations.</span>
            </h1>
            <p className="hero-description">
              A thoughtful question opens a world of possibilities.
              <br className="desktop-break" /> Build, share, and learn. All in
              one beautiful workspace.
            </p>
            <div className="landing-actions">
              <BuilderLink light />
              <SampleLink
                className="landing-text-link"
                label="Try a sample form"
              />
              <ArrowRight size={18} aria-hidden="true" />
            </div>
            <p className="hero-note">A small idea. An open invitation.</p>
          </div>
          <div className="landing-container feature-cards">
            {features.map((feature) => (
              <a
                key={feature.label}
                href={feature.href}
                className={`landing-feature-card ${feature.visual}`}
              >
                <span className="landing-eyebrow">{feature.label}</span>
                <h2>{feature.title}</h2>
                <p>{feature.text}</p>
                <div className="card-miniature" aria-hidden="true">
                  {feature.visual === "build" ? (
                    <>
                      <div className="mini-question">
                        <GripVertical size={14} />
                        <span className="mini-type">T</span>First things first,
                        your name?
                        <Check size={13} />
                      </div>
                      <div className="mini-question">
                        <GripVertical size={14} />
                        <span className="mini-type violet">
                          <List size={12} />
                        </span>
                        What made your day?
                      </div>
                    </>
                  ) : feature.visual === "share" ? (
                    <>
                      <div className="mini-link">
                        <Link2 size={16} />
                        typeform.builder / your-form
                        <ArrowUpRight size={14} />
                      </div>
                      <div className="mini-rating">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={19}
                            fill={i <= 4 ? "currentColor" : "none"}
                          />
                        ))}
                        <Check size={16} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mini-bar">
                        <span>Thoughtful design</span>
                        <i style={{ width: "76%" }} />
                      </div>
                      <div className="mini-bar">
                        <span>Helpful people</span>
                        <i style={{ width: "52%" }} />
                      </div>
                    </>
                  )}
                </div>
                <span className="feature-card-link">
                  Explore {feature.label.toLowerCase()} <ArrowRight size={18} />
                </span>
              </a>
            ))}
          </div>
          <div className="landing-container hero-showcase">
            <Reveal>
              <HeroDemo />
            </Reveal>
          </div>
        </section>

        <section
          id="build"
          className="landing-section light-section"
          aria-labelledby="build-heading"
        >
          <div className="landing-container feature-section">
            <Reveal className="section-copy">
              <p className="landing-eyebrow">
                A LITTLE CURIOUS. COMPLETELY YOU.
              </p>
              <h2 id="build-heading">
                Build forms without
                <br />
                breaking your flow.
              </h2>
              <p>
                Start with a question. Make it your own, move it around, and see
                it come to life. The details stay out of the way of your ideas.
              </p>
              <BuilderLink />
              <ul className="landing-benefits">
                <li>
                  <CheckCheck size={17} />
                  Eight question types
                </li>
                <li>
                  <CheckCheck size={17} />
                  Live preview
                </li>
                <li>
                  <CheckCheck size={17} />
                  Reliable autosave
                </li>
              </ul>
            </Reveal>
            <Reveal className="section-visual">
              <BuilderDemo />
            </Reveal>
          </div>
        </section>

        <section
          id="share"
          className="landing-section dark-section"
          aria-labelledby="share-heading"
        >
          <div className="landing-container feature-section reversed">
            <Reveal className="section-visual player-showcase">
              <div className="floating-note">
                <span className="note-icon">
                  <Link2 size={19} />
                </span>
                <div>
                  One link. Any screen.
                  <small>Ready for a real conversation.</small>
                </div>
              </div>
              <PlayerDemo />
            </Reveal>
            <Reveal className="section-copy">
              <p className="landing-eyebrow">LESS FORM. MORE CONVERSATION.</p>
              <h2 id="share-heading">
                Give every question
                <br />
                its moment.
              </h2>
              <p>
                A little space makes all the difference. Let people answer at
                their pace, with thoughtful controls and a flow that feels
                natural.
              </p>
              <SampleLink
                className="landing-button light"
                label="Try a sample"
              />
              <ul className="landing-benefits">
                <li>
                  <CheckCheck size={17} />
                  Keyboard friendly
                </li>
                <li>
                  <CheckCheck size={17} />
                  Made for mobile
                </li>
                <li>
                  <CheckCheck size={17} />
                  One question at a time
                </li>
              </ul>
            </Reveal>
          </div>
        </section>

        <section
          id="learn"
          className="landing-section light-section"
          aria-labelledby="learn-heading"
        >
          <div className="landing-container feature-section">
            <Reveal className="section-copy">
              <p className="landing-eyebrow">
                THERE’S A STORY IN EVERY ANSWER.
              </p>
              <h2 id="learn-heading">
                A little feedback.
                <br />A clearer picture.
              </h2>
              <p>
                Explore each response or take a step back. Simple summaries and
                original answers help you see what matters, even as your form
                evolves.
              </p>
              <Link href="/workspace" className="landing-button dark">
                Explore your workspace <ArrowRight size={18} />
              </Link>
              <p className="section-footnote">
                Your responses. Their original words. Always.
              </p>
            </Reveal>
            <Reveal className="section-visual">
              <ResultsDemo />
            </Reveal>
          </div>
        </section>

        <section
          id="how-it-works"
          className="landing-section format-section"
          aria-labelledby="formats-heading"
        >
          <div className="landing-container">
            <Reveal className="section-heading">
              <p className="landing-eyebrow">
                SHORT ANSWERS. BIG IDEAS. EVERYTHING BETWEEN.
              </p>
              <h2 id="formats-heading">
                Every question has
                <br />
                the right format.
              </h2>
              <p>
                From a simple hello to a five-star feeling. Find your way to
                ask.
              </p>
            </Reveal>
            <TypeShowcase />
            <ol className="landing-steps">
              <li>
                <span>01</span>
                <h3>Make room for curiosity.</h3>
                <p>Choose your questions and shape the details.</p>
              </li>
              <li>
                <span>02</span>
                <h3>Send an open invitation.</h3>
                <p>Publish your form and share a single link.</p>
              </li>
              <li>
                <span>03</span>
                <h3>See where it takes you.</h3>
                <p>Explore responses and learn something new.</p>
              </li>
            </ol>
          </div>
        </section>

        <section
          id="examples"
          className="landing-section examples-section"
          aria-labelledby="examples-heading"
        >
          <div className="landing-container">
            <div className="section-heading">
              <p className="landing-eyebrow">
                A STARTING POINT FOR SOMETHING GREAT.
              </p>
              <h2 id="examples-heading">
                Good conversations
                <br />
                start here.
              </h2>
              <p>A few ideas to get your next form going.</p>
            </div>
            <ExampleCarousel />
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-heading">
          <div className="landing-container">
            <p className="landing-eyebrow">GO ON. ASK SOMETHING.</p>
            <h2 id="final-heading">
              Your next great form
              <br />
              starts here.
            </h2>
            <div className="landing-actions">
              <BuilderLink light />
              <SampleLink className="landing-text-link" label="Try a sample" />
              <ArrowRight size={18} aria-hidden="true" />
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="landing-container">
          <Link href="/" className="landing-brand">
            <Layers2 size={26} />
            Typeform <span>Builder</span>
          </Link>
          <nav aria-label="Footer navigation">
            <Link href="/workspace">Workspace</Link>
            <a href="#examples">Examples</a>
            <a
              href="https://github.com/Gupta2708/Typeform-clone#readme"
              target="_blank"
              rel="noreferrer"
            >
              Documentation <ArrowUpRight size={13} />
            </a>
          </nav>
          <p>
            An original full-stack assignment.
            <br />
            Made for more human conversations.
          </p>
        </div>
      </footer>
    </div>
  );
}
