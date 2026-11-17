import { routeHref } from '../lib/router';

type HowItWorksPageProps = {
  onStart: () => void;
};

const STORED_RESULT = `{
  "all_passed": false,
  "checks": [
    { "id": "C1", "passed": true },
    { "id": "C2", "passed": true },
    { "id": "C3", "passed": false }
  ]
}`;

const LIMITS = [
  {
    title: 'Ambiguous criteria',
    body: '“Looks professional” cannot be checked from HTML. The contract marks unclear requirements as failed rather than guessing.',
  },
  {
    title: 'Pages that change',
    body: 'Validators read the page independently, so content that moves between reads can end in disagreement. That is reported as undetermined.',
  },
  {
    title: 'Behind a login',
    body: 'Public evidence only. If a validator cannot load the page, the evaluation fails instead of inventing a result.',
  },
  {
    title: 'Scripted pages',
    body: 'Rendering helps with JavaScript-heavy sites, but content built after several seconds may still be missing from the captured HTML.',
  },
];

export function HowItWorksPage({ onStart }: HowItWorksPageProps) {
  return (
    <>
      <section className="hiw-hero">
        <div className="lp-eyebrow">
          <span className="eyebrow-line" /> How it works
        </div>
        <h1 className="hiw-title">
          From a sentence
          <br />
          to a recorded decision.
        </h1>
        <p className="hiw-lead">
          SpecProof turns “did they deliver?” into a short rubric, a public page read, and an
          agreement between validators. Nothing more, and nothing hidden.
        </p>
        <div className="lp-actions">
          <button className="button button-primary button-lg" type="button" onClick={onStart}>
            Start an evaluation <span aria-hidden="true">↗</span>
          </button>
          <a
            className="button button-outline button-lg"
            href="https://docs.genlayer.com/developers/intelligent-contracts/introduction"
            target="_blank"
            rel="noreferrer"
          >
            Read the GenLayer docs ↗
          </a>
        </div>
      </section>

      <div className="hiw-body">
        <section className="hiw-step" aria-labelledby="hiw-step-1">
          <span className="hiw-step-index">01</span>
          <div>
            <h2 id="hiw-step-1">Agree on the rubric</h2>
            <p>
              Every case stores a public URL and up to six one-line requirements. The contract reads
              them in order and gives each one an id: C1, C2, C3.
            </p>
            <div className="hiw-examples">
              <div className="hiw-example hiw-example--good">
                <strong>CHECKABLE</strong>
                <ul>
                  <li>A clear page heading is visible without scrolling</li>
                  <li>A contact link is available in the page navigation</li>
                  <li>The primary action is clearly labelled</li>
                </ul>
              </div>
              <div className="hiw-example hiw-example--bad">
                <strong>NOT CHECKABLE</strong>
                <ul>
                  <li>Make it pop</li>
                  <li>Better than the competitor</li>
                  <li>Feels premium on mobile</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="hiw-step" aria-labelledby="hiw-step-2">
          <span className="hiw-step-index">02</span>
          <div>
            <h2 id="hiw-step-2">Check the public evidence</h2>
            <p>
              Inside a non-deterministic block, the contract renders the submitted URL and asks for
              exactly one boolean per criterion. The page is treated as untrusted input, so text in
              the page cannot instruct the evaluator.
            </p>
            <p>
              A validator does not trust the leader. It repeats the read with its own request and
              compares the stable decision fields. Only ids and pass/fail values are compared, so
              two validators who read slightly different HTML can still agree on the result.
            </p>
            <ul className="hiw-list">
              <li>No evidence for a criterion means fail, never a guess.</li>
              <li>Mismatched ids or non-boolean values are rejected outright.</li>
              <li>Conflicting validators leave the case undetermined.</li>
            </ul>
          </div>
        </section>

        <section className="hiw-step" aria-labelledby="hiw-step-3">
          <span className="hiw-step-index">03</span>
          <div>
            <h2 id="hiw-step-3">Record one decision</h2>
            <p>
              Once validators agree, the contract writes a small JSON record and marks the case
              evaluated. A second evaluation is rejected, so the stored result stays a record rather
              than a score that can be refreshed until it looks good.
            </p>
            <pre className="hiw-json">{STORED_RESULT}</pre>
          </div>
        </section>

        <section className="hiw-step" aria-labelledby="hiw-limits-title">
          <span className="hiw-step-index">04</span>
          <div>
            <h2 id="hiw-limits-title">Know the limits</h2>
            <p>
              A verifiable decision still depends on a readable page and a checkable requirement.
              These are the cases SpecProof deliberately refuses to pretend about.
            </p>
            <div className="hiw-limits">
              {LIMITS.map((limit) => (
                <article className="hiw-limit" key={limit.title}>
                  <h3>{limit.title}</h3>
                  <p>{limit.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hiw-cta">
          <div>
            <span className="lp-kicker">TRY IT</span>
            <h2>Bring one real delivery check.</h2>
            <p>
              Write the rubric you would argue about later, then see what the workspace records.
            </p>
          </div>
          <div className="lp-cta-actions">
            <button className="button button-primary button-lg" type="button" onClick={onStart}>
              Open the workspace <span aria-hidden="true">↗</span>
            </button>
            <a className="button button-outline button-lg" href={routeHref('landing')}>
              Back to product
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
