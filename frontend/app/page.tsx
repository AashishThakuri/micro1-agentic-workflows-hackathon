import Image from "next/image";
import { Button03 } from "@/components/ui/pixel-broke-button";
import { NavDock } from "./NavDock";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header" aria-label="Primary navigation">
        <NavDock />
      </header>

      <section className="hero page-grid" id="top">
        <a className="hero-brand" href="#top" aria-label="Ocular home">
          Ocular
        </a>

        <div className="hero-topline">
          <h1 className="display hero-title">Curiosity should</h1>
          <div className="hero-cta">
            <Button03 />
          </div>
        </div>

        <div className="hero-media-wrap">
          <div className="hero-media">
            <Image
              className="hero-image"
              src="/images/hero-feel-clean.png"
              alt="A woman reading in a wildflower field as flowers sweep past her in motion"
              fill
              priority
              sizes="(max-width: 40rem) 100vw, 96vw"
            />
            <p className="image-message" aria-label="Learn through what you feel.">
              <span className="image-message-olive">learn</span>
              <span className="image-message-olive">through</span>
              <span className="image-message-paper">what you</span>
              <span className="image-message-paper">feel.</span>
            </p>
            <p className="display move-label"><span className="move-label-text">Bloom!</span></p>
          </div>
        </div>
      </section>
    </main>
  );
}
