import { useEffect, useRef } from 'react';
import { pad2 } from '../lib/format';
import type { EvaluationCase } from '../types';

const SAMPLE_NOTE = 'Illustrative check only; no page was fetched.';

type CaseDetailDialogProps = {
  item: EvaluationCase | null;
  onClose: () => void;
};

export function CaseDetailDialog({ item, onClose }: CaseDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (item && !dialog.open) {
      dialog.showModal();
    } else if (!item && dialog.open) {
      dialog.close();
    }
  }, [item]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

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
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
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
            <div className="detail-url">{item.url}</div>

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

            <div className="detail-section-title">
              ACCEPTANCE CHECKS · {pad2(criteria.length)}
            </div>

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
                      {isDraft
                        ? 'Pending a real GenLayer evaluation.'
                        : check?.note ?? SAMPLE_NOTE}
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
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
