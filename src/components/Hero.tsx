type HeroProps = {
  onNewCase: () => void;
};

export function Hero({ onNewCase }: HeroProps) {
  return (
    <section className="hero-card" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="eyebrow-line" /> DELIVERY, MADE VERIFIABLE
        </div>
        <h1 id="hero-title">
          Proof for work
          <br />
          that <em>ships.</em>
        </h1>
        <p>
          Agree on what “done” means. Let independent validators check the evidence, not just a
          promise.
        </p>
        <button className="button button-primary" type="button" onClick={onNewCase}>
          Create an evaluation <span className="button-arrow" aria-hidden="true">↗</span>
        </button>
        <div className="hero-note">
          <span className="note-check">✓</span> Built for public, independently verifiable
          deliverables
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="orbit orbit-three" />
        <div className="orbit-core">
          <span className="core-star">✳</span>
        </div>
        <div className="art-card art-card-top">
          <span className="mini-check">✓</span>
          <span>Criteria agreed</span>
          <span className="art-card-dot" />
        </div>
        <div className="art-card art-card-bottom">
          <span className="validator-stack">
            <i>V</i>
            <i>V</i>
            <i>V</i>
          </span>
          <span>Independent review</span>
          <span className="art-card-check">✓</span>
        </div>
        <div className="art-caption">
          A clearer definition
          <br />
          of “done”.
        </div>
      </div>
      <div className="hero-grain" aria-hidden="true" />
    </section>
  );
}
