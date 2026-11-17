import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { pad2 } from '../lib/format';
import { publicHostProblem } from '../lib/hostCheck';
import type { NewCaseInput } from '../types';

const DEFAULT_CRITERION = 'A clear page heading is visible without scrolling';
const MAX_CRITERIA = 6;

type CriterionDraft = {
  id: string;
  text: string;
};

let criterionCounter = 0;

function createCriterion(text: string): CriterionDraft {
  criterionCounter += 1;
  return { id: `criterion-${criterionCounter}`, text };
}

type NewCaseDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewCaseInput) => boolean;
};

export function NewCaseDialog({ open, onClose, onCreate }: NewCaseDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const pressedOnBackdrop = useRef(false);
  const focusLastRow = useRef(false);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [criteria, setCriteria] = useState<CriterionDraft[]>([createCriterion(DEFAULT_CRITERION)]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setTitle('');
      setUrl('');
      setCriteria([createCriterion(DEFAULT_CRITERION)]);
      setError(null);
      dialog.showModal();
      const timer = window.setTimeout(() => urlRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }

    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  // Focus the row just added, without stealing focus on every keystroke.
  useEffect(() => {
    if (!focusLastRow.current) return;
    focusLastRow.current = false;
    const inputs = listRef.current?.querySelectorAll<HTMLInputElement>('input.criterion-input');
    inputs?.[inputs.length - 1]?.focus();
  });

  function updateCriterion(id: string, text: string) {
    setError(null);
    setCriteria((current) =>
      current.map((criterion) => (criterion.id === id ? { ...criterion, text } : criterion)),
    );
  }

  function addCriterion() {
    setError(null);
    setCriteria((current) => {
      if (current.length >= MAX_CRITERIA) return current;
      focusLastRow.current = true;
      return [...current, createCriterion('')];
    });
  }

  function removeCriterion(id: string) {
    setError(null);
    setCriteria((current) =>
      current.length <= 1 ? current : current.filter((criterion) => criterion.id !== id),
    );
  }

  function handleCriterionKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    // Enter adds a criterion instead of submitting a half-written case.
    event.preventDefault();
    if (criteria.length < MAX_CRITERIA) addCriterion();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUrl = url.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      setError('Enter a valid public website URL.');
      return;
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      setError('Use a public HTTP or HTTPS website URL.');
      return;
    }

    const hostProblem = publicHostProblem(parsedUrl);
    if (hostProblem) {
      setError(hostProblem);
      return;
    }

    const cleanedCriteria = criteria.map((criterion) => criterion.text.trim()).filter(Boolean);
    if (cleanedCriteria.length === 0) {
      setError('Add at least one acceptance criterion.');
      return;
    }

    setError(null);
    onCreate({ title: title.trim(), url: parsedUrl.href, criteria: cleanedCriteria });
  }

  return (
    <dialog
      className="modal"
      id="case-dialog"
      ref={dialogRef}
      aria-labelledby="modal-title"
      onPointerDown={(event) => {
        pressedOnBackdrop.current = event.target === dialogRef.current;
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && event.target === dialogRef.current) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <form className="modal-card" id="case-form" onSubmit={handleSubmit}>
        <div className="modal-topline">
          <span className="modal-eyebrow">NEW EVALUATION</span>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>
            ×
          </button>
        </div>
        <h2 id="modal-title">Make “done” explicit.</h2>
        <p className="modal-intro">
          Create a local draft with a public URL and checks that can be verified from the page.
        </p>

        <label className="field-label" htmlFor="case-title">
          Case name <span>OPTIONAL</span>
        </label>
        <input
          className="text-input"
          id="case-title"
          name="title"
          type="text"
          maxLength={64}
          placeholder="e.g. Spring campaign landing page"
          value={title}
          onChange={(event) => {
            setError(null);
            setTitle(event.target.value);
          }}
        />

        <label className="field-label" htmlFor="case-url">
          Public website URL <span>REQUIRED</span>
        </label>
        <div className="input-with-prefix">
          <span aria-hidden="true">↗</span>
          <input
            className="text-input"
            id="case-url"
            name="url"
            type="url"
            placeholder="https://example.com"
            required
            aria-invalid={error ? true : undefined}
            ref={urlRef}
            value={url}
            onChange={(event) => {
              setError(null);
              setUrl(event.target.value);
            }}
          />
        </div>

        <div className="rubric-heading">
          <div>
            <label className="field-label" htmlFor="criterion-1">
              Acceptance criteria
            </label>
            <p>Use one observable requirement per line. Enter adds the next row.</p>
          </div>
          <span className="rubric-count">
            {pad2(criteria.length)} / {pad2(MAX_CRITERIA)}
          </span>
        </div>

        <div className="criteria-list" id="criteria-list" ref={listRef}>
          {criteria.map((criterion, index) => (
            <div className="criterion-row" key={criterion.id}>
              <span className="criterion-index">{pad2(index + 1)}</span>
              <input
                className="text-input criterion-input"
                id={`criterion-${index + 1}`}
                type="text"
                maxLength={180}
                required
                placeholder="e.g. A pricing link is visible in the footer"
                aria-label={`Acceptance criterion ${index + 1}`}
                value={criterion.text}
                onChange={(event) => updateCriterion(criterion.id, event.target.value)}
                onKeyDown={handleCriterionKeyDown}
              />
              <button
                type="button"
                className="remove-criterion"
                aria-label={`Remove criterion ${index + 1}`}
                disabled={criteria.length === 1}
                onClick={() => removeCriterion(criterion.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          className="add-criterion"
          type="button"
          disabled={criteria.length >= MAX_CRITERIA}
          onClick={addCriterion}
        >
          <span aria-hidden="true">+</span>{' '}
          {criteria.length >= MAX_CRITERIA ? 'Six criteria is the maximum' : 'Add another criterion'}
        </button>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="modal-note">
          <span aria-hidden="true">i</span>
          <p>
            This saves a draft in your browser only. Live website checks, wallet connection, and
            GenLayer submission are not connected in this prototype.
          </p>
        </div>

        <div className="modal-actions">
          <button className="button button-quiet" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" type="submit">
            Save draft <span className="button-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}
