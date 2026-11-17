import { useEffect, useRef, useState } from 'react';
import type { ToastTone } from '../hooks/useToast';
import { copyText } from '../lib/clipboard';
import { pad2 } from '../lib/format';
import type { EvaluationCase } from '../types';

const SAMPLE_NOTE = 'Illustrative check only; no page was fetched.';

type CaseDetailDialogProps = {
  item: EvaluationCase | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onNotify: (message: string, tone: ToastTone) => void;
};

export function CaseDetailDialog({ item, onClose, onDelete, onNotify }: CaseDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (item && !dialog.open) dialog.showModal();
    else if (!item && dialog.open) dialog.close();
  }, [item]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  useEffect(() => {
    setConfirmingDelete(false);
  }, [item?.id]);

  async function handleCopy() {
    if (!item) return;
    const copied = await copyText(item.url);
    onNotify(
      copied ? 'Website URL copied.' : 'Could not copy the URL. Copy it manually instead.',
      copied ? 'success' : 'error',
    );
  }

  const isDraft = item?.status === 'draft';
  const criteria = item?.criteria ?? [];
  const checks = item?.checks ?? [];
  const passedCount = checks.filter((check) => check.passed).length;

  return (
    <dialog
      className="modal detail-modal"
      id="detail-dialog"
      ref={dialogRef}
      aria-labelledby="detail-title"
      onPointerDown={(event) => {
        pressedOnBackdrop.current = event.target === dialogRef.current;
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && event.target === dialogRef.current) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div className="modal-card detail-card">
        <div className="modal-topline">
          <span className="modal-eyebrow" id="detail-eyebrow">
            {isDraft ? 'LOCAL DRAFT' : 'ILLUSTRATIVE SAMPLE'}
          </span>
          <button className="icon-button" type="button" aria-label="Close details" onClick={onClose}>
            ×
          </button>
        </div>

        {item ? (
          <div id="detail-content">
            <h2 id="detail-title">{item.title}</h2>
            <div className="detail-url-row">
              <span className="detail-url">{item.url}</span>
              <button className="detail-copy" type="button" onClick={() => void handleCopy()}>
                Copy URL
              </button>
            </div>

            <div className="detail-summary">
              <span>
                <strong>{isDraft ? 'Not evaluated' : 'Illustrative result'}</strong>
                <small>
                  {isDraft
                    ? 'Saved in this browser only'
                    : 'Sample data — not fetched from the website'}
                </small>
              </span>
              <span className="detail-score">
                {isDraft ? '—' : `${passedCount}/${criteria.length}`}
              </span>
            </div>

            <div className="detail-section-title">ACCEPTANCE CHECKS · {pad2(criteria.length)}</div>

            {criteria.map((criterion, index) => {
              const check = checks[index];
              const passed = !isDraft && Boolean(check?.passed);
              return (
                <div className="detail-check" key={`${item.id}-${index}`}>
                  <span className={isDraft ? 'check-mark pending' : 'check-mark'}>
                    {isDraft ? '·' : passed ? '✓' : '×'}
                  </span>
                  <span>
                    <strong>{criterion}</strong>
                    <small>
                      {isDraft ? 'Pending a real GenLayer evaluation.' : check?.note ?? SAMPLE_NOTE}
                    </small>
                  </span>
                </div>
              );
            })}

            <div className="detail-disclaimer">
              {isDraft
                ? 'This is a draft only. The prototype does not fetch this URL, run an LLM, connect a wallet, or submit a transaction.'
                : 'This is illustrative UI data to demonstrate the result format. It is not a live inspection, validator decision, or on-chain result.'}
            </div>

            {isDraft ? (
              confirmingDelete ? (
                <div className="detail-confirm" role="alertdialog" aria-label="Delete draft">
                  <p>Delete this draft? It only exists in this browser.</p>
                  <div className="detail-confirm-actions">
                    <button
                      className="button button-quiet"
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Keep draft
                    </button>
                    <button
                      className="button button-danger"
                      type="button"
                      onClick={() => onDelete(item.id)}
                    >
                      Delete draft
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="button button-quiet detail-delete"
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete draft
                </button>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
