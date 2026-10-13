import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Asterisk,
  Music2,
  Film,
  Layers3,
} from "lucide-react";
export default function Home() {
  return (
    <main id="main">
      <section className="hero wrap">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="small-line" /> CULTURE IS CONNECTED. SO ARE YOU.
          </span>
          <h1>
            Your taste is
            <br />a pattern.
            <br />
            <em>Discover yours.</em>
          </h1>
          <p>
            The music you replay. The films you feel. The way you dress.
            <br className="desktop" /> We weave it all into a world that feels
            like you.
          </p>
          <Link className="button" href="/discover">
            Discover My Taste <ArrowUpRight size={20} />
          </Link>
          <div className="hero-note">
            <span className="tiny-star">✳</span> A few favorites. A fresh
            perspective. <span>~2 min</span>
          </div>
        </div>
        <div
          className="moodboard"
          aria-label="Illustrative taste moodboard, not API results"
        >
          <div className="board-caption">
            A PORTRAIT IN PREFERENCES <span>NO. 001</span>
          </div>
          <div className="art-block art-arch">
            <div className="sun" />
            <div className="arch" />
            <span>
              THE ART OF
              <br />
              <i>slowing down.</i>
            </span>
          </div>
          <div className="vinyl-card">
            <div className="vinyl">
              <div>
                TW
                <br />
                <small>SIDE A</small>
              </div>
            </div>
            <span>ON REPEAT</span>
            <strong>Something soulful.</strong>
          </div>
          <div className="fabric-card">
            <div className="fabric" />
            <span>TEXTURE / FORM / FEELING</span>
          </div>
          <div className="board-note">
            <Asterisk size={24} />
            <span>
              Different interests.
              <br />
              <em>One unmistakable you.</em>
            </span>
          </div>
          <div className="profile-float">
            <span className="eyebrow">EXAMPLE TASTE DNA</span>
            <h3>The Everyday Aesthete</h3>
            <div className="swatches">
              <i style={{ background: "#74775c" }} />
              <i style={{ background: "#b88767" }} />
              <i style={{ background: "#d0bca0" }} />
              <i style={{ background: "#ede6d8" }} />
            </div>
            <p>Soulful sounds · Considered style · Slow living</p>
            <span className="sample-label">Illustrative preview</span>
          </div>
        </div>
      </section>
      <section className="culture-strip">
        <span>YOUR WORLD, WOVEN TOGETHER</span>
        <p>
          Music <Asterisk /> Film <Asterisk /> Style <Asterisk /> Art{" "}
          <Asterisk /> Everyday life
        </p>
      </section>
      <section className="wrap approach" id="how-it-works">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE THREAD BETWEEN THINGS</span>
            <h2>More than “you might like.”</h2>
          </div>
          <p>
            Your favorites are a starting point.
            <br />
            The interesting part is what connects them.
          </p>
        </div>
        <div className="steps-grid">
          {[
            {
              icon: Music2,
              n: "01",
              title: "Start with what moves you.",
              text: "An artist on repeat. A film you keep coming back to. Tell us a few things you love.",
            },
            {
              icon: Layers3,
              n: "02",
              title: "Follow the cultural threads.",
              text: "In live mode, Qloo retrieves entities and cross-category suggestions. In demo mode, clearly labeled samples let you explore.",
            },
            {
              icon: Film,
              n: "03",
              title: "Make it your own.",
              text: "Explore outfit concepts and cultural discoveries, with the source behind every suggestion. Refine as your taste evolves.",
            },
          ].map((s) => (
            <article key={s.n}>
              <div className="step-top">
                <s.icon size={24} strokeWidth={1.3} />
                <span>{s.n}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="wrap closing">
        <span className="eyebrow">
          CURIOUS BY DESIGN. TRANSPARENT BY DEFAULT.
        </span>
        <h2>
          A recommendation should
          <br />
          come with a <em>reason.</em>
        </h2>
        <p>
          See the retrieved entities behind each pick. Style descriptions are
          creative interpretations, never objective classifications. No invented
          scores. No hidden evidence.
        </p>
        <Link href="/discover" className="text-link">
          Let’s connect your dots <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
