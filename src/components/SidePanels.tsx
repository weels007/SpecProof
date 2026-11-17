export function SidePanels() {
  return (
    <aside className="side-column">
      <section className="pipeline-card" id="how-it-works">
        <div className="side-card-heading">
          <div>
            <div className="section-kicker">THE DECISION PATH</div>
            <h3>From spec to signal</h3>
          </div>
          <span className="pipeline-badge">3 steps</span>
        </div>
        <div className="pipeline-steps">
          <div className="pipeline-step">
            <span className="step-number">01</span>
            <div>
              <strong>Agree on the rubric</strong>
              <p>Write observable checks before work begins.</p>
            </div>
            <span className="step-status status-done">✓</span>
          </div>
          <div className="pipeline-step">
            <span className="step-number">02</span>
            <div>
              <strong>Check public evidence</strong>
              <p>Validators independently inspect the submitted page.</p>
            </div>
            <span className="step-status status-live">
              <i />
            </span>
          </div>
          <div className="pipeline-step">
            <span className="step-number">03</span>
            <div>
              <strong>Record the decision</strong>
              <p>A structured result can update shared contract state.</p>
            </div>
            <span className="step-status status-next">03</span>
          </div>
        </div>
        <a
          className="learn-link"
          href="https://docs.genlayer.com/developers/intelligent-contracts/when-to-use-genlayer"
          target="_blank"
          rel="noreferrer"
        >
          Why GenLayer for this? <span>↗</span>
        </a>
      </section>

      <section className="principle-card">
        <div className="principle-mark" aria-hidden="true">
          “
        </div>
        <div className="section-kicker">A BETTER DEFINITION OF DONE</div>
        <blockquote>
          Don’t ask an AI if it looks good. Ask whether the agreed criteria are met.
        </blockquote>
        <div className="principle-footer">
          <span className="principle-line" />
          <span>SPEC FIRST. EVIDENCE ALWAYS.</span>
        </div>
      </section>
    </aside>
  );
}
