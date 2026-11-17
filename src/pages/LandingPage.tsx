import { routeHref } from '../lib/router';

type LandingPageProps = {
  onStart: () => void;
};

const VERDICT_ROWS = [
  { label: 'Clear page heading', passed: true },
  { label: 'Contact link in navigation', passed: true },
  { label: 'Primary action clearly labelled', passed: false },
];

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <>
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow">
              <span className="eyebrow-line" /> Delivery, made verifiable
            </div>
            <h1 className="lp-title">
              Proof for work
              <br />
              that <em>ships.</em>
            </h1>
            <p className="lp-lead">
              Agree on what “done” means before work starts. Then let independent GenLayer
              validators check the public evidence — not a promise in a chat thread.
            </p>
            <div className="lp-actions">
              <button className="button button-primary button-lg" type="button" onClick={onStart}>
                Start an evaluation <span aria-hidden="true">↗</span>
              </button>
              <a className="button button-outline button-lg" href={routeHref('how-it-works')}>
                See how it works
              </a>
            </div>
            <ul className="lp-points">
              <li>
                <span aria-hidden="true">✓</span> Criteria in plain language
              </li>
              <li>
                <span aria-hidden="true">✓</span> Validators inspect the live page
              </li>
              <li>
                <span aria-hidden="true">✓</span> One recorded result per criterion
              </li>
            </ul>
          </div>

          <div className="lp-hero-art" aria-hidden="true">
            <div className="lp-verdict-glow" />
            <div className="lp-verdict">
              <div className="lp-verdict-head">
                <span className="lp-verdict-mark">N</span>
                <div>
                  <strong>Northstar launch</strong>
                  <small>launch.example</small>
                </div>
                <span className="lp-verdict-pill">Example</span>
              </div>
              {VERDICT_ROWS.map((row) => (
                <div className="lp-verdict-row" key={row.label}>
                  <span className={row.passed ? 'lp-mark lp-mark--pass' : 'lp-mark lp-mark--fail'}>
                    {row.passed ? '✓' : '×'}
                  </span>
                  <span>{row.label}</span>
                  <span className="lp-row-state">{row.passed ? 'PASS' : 'FAIL'}</span>
                </div>
              ))}
              <div className="lp-verdict-foot">
                <span>2 of 3 criteria met</span>
                <span className="lp-verdict-score">67%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-stats" aria-label="How SpecProof works at a glance">
        <div>
          <strong>3</strong>
          <span>steps from rubric to recorded result</span>
        </div>
        <div>
          <strong>6</strong>
          <span>observable criteria per case</span>
        </div>
        <div>
          <strong>1</strong>
          <span>outcome, written once, not edited</span>
        </div>
      </section>

      <section className="lp-section" aria-labelledby="lp-how-title">
        <div className="lp-section-head">
          <div>
            <span className="lp-kicker">HOW IT WORKS</span>
            <h2 className="lp-h2" id="lp-how-title">
              Three steps. No vibes.
            </h2>
          </div>
          <a className="text-link" href={routeHref('how-it-works')}>
            Read the full method ↗
          </a>
        </div>
        <div className="lp-steps">
          <article className="lp-step">
            <span className="lp-step-number">01</span>
            <h3>Agree on the rubric</h3>
            <p>
              Write up to six requirements a person could check on the page. “Heading is visible”
              beats “looks polished”.
            </p>
            <span className="lp-step-tag">BEFORE WORK STARTS</span>
          </article>
          <article className="lp-step">
            <span className="lp-step-number">02</span>
            <h3>Check public evidence</h3>
            <p>
              The contract renders the submitted URL and asks for one pass or fail per criterion.
              Every validator repeats the read.
            </p>
            <span className="lp-step-tag">INDEPENDENT VALIDATORS</span>
          </article>
          <article className="lp-step">
            <span className="lp-step-number">03</span>
            <h3>Record the decision</h3>
            <p>
              Validators compare the stable boolean decisions. Agreement writes one small result
              that cannot be re-opened.
            </p>
            <span className="lp-step-tag">WRITTEN ONCE</span>
          </article>
        </div>
      </section>

      <section className="lp-section" aria-labelledby="lp-why-title">
        <div className="lp-section-head">
          <div>
            <span className="lp-kicker">WHY IT HOLDS UP</span>
            <h2 className="lp-h2" id="lp-why-title">
              Judgment that can be argued with.
            </h2>
            <p className="lp-section-lead">
              A single backend can quietly change its mind. SpecProof keeps the rule explicit, the
              evidence public, and the agreement verifiable.
            </p>
          </div>
        </div>
        <div className="lp-features">
          <article className="lp-feature">
            <h3>Criteria before code</h3>
            <p>The rubric is part of the deal, stored with the case instead of living in a DM.</p>
          </article>
          <article className="lp-feature">
            <h3>Evidence, not opinions</h3>
            <p>
              Decisions are grounded in the rendered page. A model cannot pass a criterion that has
              no evidence.
            </p>
          </article>
          <article className="lp-feature">
            <h3>Independent second opinions</h3>
            <p>
              Each validator re-reads the page. Conflicting booleans mean “undetermined”, not “trust
              the leader”.
            </p>
          </article>
          <article className="lp-feature">
            <h3>Small, comparable output</h3>
            <p>
              Only ids and pass/fail booleans are compared, so the record stays readable and stable.
            </p>
          </article>
        </div>
      </section>

      <section className="lp-status" aria-labelledby="lp-status-title">
        <div className="lp-status-inner">
          <div>
            <span className="lp-kicker">CURRENT SCOPE</span>
            <h2 className="lp-h2" id="lp-status-title">
              Prototype, stated plainly.
            </h2>
            <p className="lp-section-lead">
              The interface is real; the chain wiring is not. Everything below is true today, and
              the product says so on the dashboard too.
            </p>
          </div>
          <ul>
            <li>Drafts live in this browser only.</li>
            <li>No wallet transaction is submitted.</li>
            <li>The contract is tested in CI, not deployed.</li>
            <li>Sample rows are illustrative, never live checks.</li>
          </ul>
        </div>
      </section>

      <section className="lp-cta" aria-labelledby="lp-cta-title">
        <div className="lp-cta-inner">
          <h2 id="lp-cta-title">Write the rubric once. Check the evidence later.</h2>
          <div className="lp-cta-actions">
            <button className="button button-primary button-lg" type="button" onClick={onStart}>
              Open the workspace <span aria-hidden="true">↗</span>
            </button>
            <a className="button button-outline button-lg" href={routeHref('how-it-works')}>
              How decisions are made
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
