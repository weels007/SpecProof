import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastTone } from '../hooks/useToast';
import { copyText } from '../lib/clipboard';
import { pad2 } from '../lib/format';
import { chainErrorMessage, evaluateCase, readCase } from '../lib/genlayer';
import type { ChainCase } from '../lib/genlayer';
import type { CheckResult, EvaluationCase } from '../types';

const SAMPLE_NOTE = 'Illustrative check only; no page was fetched.';

type CaseDetailDialogProps = {
  item: EvaluationCase | null;
  walletAddress: string | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onNotify: (message: string, tone: ToastTone) => void;
  onChainEvaluated: (id: string) => void;
};

function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function CaseDetailDialog({
  item,
  walletAddress,
  onClose,
  onDelete,
  onNotify,
  onChainEvaluated,
}: CaseDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [chainCase, setChainCase] = useState<ChainCase | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const isOnChain = item?.status === 'onchain' && Boolean(item.address);

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
    setChainCase(null);
    setChainError(null);
    setEvaluating(false);
  }, [item?.id]);

  const loadChainCase = useCallback(async (address: string) => {
    setChainLoading(true);
    setChainError(null);
    try {
      setChainCase(await readCase(address));
    } catch (error) {
      setChainError(chainErrorMessage(error));
    } finally {
      setChainLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!item?.address || item.status !== 'onchain') return;
    void loadChainCase(item.address);
  }, [item?.address, item?.status, loadChainCase]);

  async function handleCopy(text: string, label: string) {
    const copied = await copyText(text);
    onNotify(
      copied ? `${label} copied.` : `Could not copy the ${label.toLowerCase()}. Copy it manually instead.`,
      copied ? 'success' : 'error',
    );
  }

  async function handleEvaluate() {
    if (!item?.address || !walletAddress || evaluating) return;
    setEvaluating(true);
    try {
      await evaluateCase(walletAddress, item.address);
      onChainEvaluated(item.id);
      await loadChainCase(item.address);
      onNotify('Evaluation recorded on Studionet.', 'success');
    } catch (error) {
      onNotify(chainErrorMessage(error), 'error');
    } finally {
      setEvaluating(false);
    }
  }

  const isDraft = item?.status === 'draft';
  const spec = chainCase?.spec;
  const chainResult = chainCase?.result ?? null;
  const criteria = isOnChain ? spec?.criteria ?? item?.criteria ?? [] : item?.criteria ?? [];
  const checks = isOnChain ? chainResult?.checks ?? [] : item?.checks ?? [];
  const passedCount = checks.filter((check) => check.passed).length;
  const evaluated = isOnChain ? spec?.evaluated ?? item?.evaluated ?? false : false;
  const isCreator =
    Boolean(walletAddress) &&
    Boolean(spec?.creator) &&
    walletAddress!.toLowerCase() === spec!.creator.toLowerCase();

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
            {isOnChain ? 'STUDIONET CASE' : isDraft ? 'LOCAL DRAFT' : 'ILLUSTRATIVE SAMPLE'}
          </span>
          <button className="icon-button" type="button" aria-label="Close details" onClick={onClose}>
            ×
          </button>
        </div>

        {item ? (
          <div id="detail-content">
            <h2 id="detail-title">{item.title}</h2>
            <div className="detail-url-row">
              <span className="detail-url">{spec?.site_url ?? item.url}</span>
              <button
                className="detail-copy"
                type="button"
                onClick={() => void handleCopy(spec?.site_url ?? item.url, 'Website URL')}
              >
                Copy URL
              </button>
            </div>

            {isOnChain ? (
              <div className="detail-address-row">
                <span>
                  Contract <code>{shortAddress(item.address ?? '')}</code>
                </span>
                <button
                  className="detail-copy"
                  type="button"
                  onClick={() => void handleCopy(item.address ?? '', 'Contract address')}
                >
                  Copy address
                </button>
              </div>
            ) : null}

            <div className="detail-summary">
              <span>
                <strong>
                  {isOnChain
                    ? evaluated
                      ? 'Recorded on Studionet'
                      : 'Waiting for evaluation'
                    : isDraft
                      ? 'Not evaluated'
                      : 'Illustrative result'}
                </strong>
                <small>
                  {isOnChain
                    ? spec
                      ? `Creator ${shortAddress(spec.creator)} · validators compare every check`
                      : 'Reading the contract…'
                    : isDraft
                      ? 'Saved in this browser only'
                      : 'Sample data — not fetched from the website'}
                </small>
              </span>
              <span className="detail-score">
                {isOnChain
                  ? chainResult
                    ? `${passedCount}/${criteria.length}`
                    : '—'
                  : isDraft
                    ? '—'
                    : `${passedCount}/${criteria.length}`}
              </span>
            </div>

            {chainLoading ? <p className="detail-note">Reading the contract from Studionet…</p> : null}
            {chainError ? (
              <p className="wallet-alert wallet-alert--error" role="alert">
                {chainError}
              </p>
            ) : null}

            <div className="detail-section-title">ACCEPTANCE CHECKS · {pad2(criteria.length)}</div>

            {criteria.map((criterion, index) => {
              const check = checks[index];
              const passed = isOnChain ? Boolean(check?.passed) : !isDraft && Boolean(check?.passed);
              const mark = isOnChain
                ? evaluated
                  ? passed
                    ? '✓'
                    : '×'
                  : '·'
                : isDraft
                  ? '·'
                  : passed
                    ? '✓'
                    : '×';
              const note = isOnChain
                ? evaluated
                  ? passed
                    ? 'Validators agreed this criterion is met.'
                    : 'Validators agreed this criterion is not met.'
                  : 'Pending a GenLayer evaluation.'
                : isDraft
                  ? 'Pending a real GenLayer evaluation.'
                  : (check as CheckResult | undefined)?.note ?? SAMPLE_NOTE;

              return (
                <div className="detail-check" key={`${item.id}-${index}`}>
                  <span className={mark === '·' ? 'check-mark pending' : 'check-mark'}>{mark}</span>
                  <span>
                    <strong>{criterion}</strong>
                    <small>{note}</small>
                  </span>
                </div>
              );
            })}

            <div className="detail-disclaimer">
              {isOnChain
                ? 'This result lives in the contract on Studionet. Only the creator wallet can record it once, and nobody can change it afterwards.'
                : isDraft
                  ? 'This is a draft only. Deploy it on Studionet to let validators record a result.'
                  : 'This is illustrative UI data to demonstrate the result format. It is not a live inspection, validator decision, or on-chain result.'}
            </div>

            {isOnChain && !evaluated && isCreator ? (
              <div className="detail-evaluate">
                <button
                  className="button button-primary"
                  type="button"
                  disabled={evaluating || chainLoading}
                  onClick={() => void handleEvaluate()}
                >
                  {evaluating ? 'Waiting for consensus…' : 'Evaluate on Studionet ↗'}
                </button>
                <p>
                  Your wallet signs the transaction. Validators fetch the page and must agree on
                  every check; a disagreement records nothing.
                </p>
              </div>
            ) : null}

            {isOnChain && !evaluated && !isCreator ? (
              <p className="detail-note">Only the wallet that deployed this case can evaluate it.</p>
            ) : null}

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
