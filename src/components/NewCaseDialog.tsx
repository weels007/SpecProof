import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { pad2 } from '../lib/format';
import type { NewCaseInput } from '../types';

const DEFAULT_CRITERION = 'A clear page heading is visible without scrolling';
const MAX_CRITERIA = 6;

type NewCaseDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewCaseInput) => void;
};

export function NewCaseDialog({ open, onClose, onCreate }: NewCaseDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [criteria, setCriteria] = useState<string[]>([DEFAULT_CRITERION]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setTitle('');
      setUrl('');
      setCriteria([DEFAULT_CRITERION]);
      setError(null);
      dialog.showModal();
      window.setTimeout(() => urlRef.current?.focus(), 40);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  function updateCriterion(index: number, value: string) {
    setCriteria((current) => current.map((item, position) => (position === index ? value : item)));
  }

  function addCriterion() {
    setCriteria((current) => (current.length >= MAX_CRITERIA ? current : [...current, '']));
  }

  function removeCriterion(index: number) {
    setCriteria((current) =>
      current.length <= 1 ? current : current.filter((_, position) => position !== index),
    );
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

    const cleanedCriteria = criteria.map((criterion) => criterion.trim()).filter(Boolean);
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
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
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
          onChange={(event) => setTitle(event.target.value)}
        />

        <label className="field-label" htmlFor="case-url">
          Public website URL <span>REQUIRED</span>
        </label>
        <div className="input-with-prefix">
          <span>↗</span>
          <input
            className="text-input"
            id="case-url"
            name="url"
            type="url"
            placeholder="https://example.com"
            required
            ref={urlRef}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>

        <div className="rubric-heading">
          <div>
            <label className="field-label" htmlFor="criterion-1">
              Acceptance criteria
            </label>
            <p>Use one observable requirement per line.</p>
          </div>
          <span className="rubric-count">
            {pad2(criteria.length)} / {pad2(MAX_CRITERIA)}
          </span>
        </div>

        <div className="criteria-list" id="criteria-list">
          {criteria.map((criterion, index) => (
            <div className="criterion-row" key={index}>
              <span className="criterion-index">{pad2(index + 1)}</span>
              <input
                className="text-input criterion-input"
                id={`criterion-${index + 1}`}
                type="text"
                maxLength={180}
                required
                placeholder="e.g. A pricing link is visible in the footer"
                aria-label={`Acceptance criterion ${index + 1}`}
                value={criterion}
                onChange={(event) => updateCriterion(index, event.target.value)}
              />
              <button
                type="button"
                className="remove-criterion"
                aria-label="Remove criterion"
                disabled={criteria.length === 1}
                onClick={() => removeCriterion(index)}
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
          <span>+</span> Add another criterion
        </button>

        {error ? <p className="form-error">{error}</p> : null}

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
