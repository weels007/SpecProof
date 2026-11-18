import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastTone } from '../hooks/useToast';
import { copyText } from '../lib/clipboard';
import { pad2, shortAddress } from '../lib/format';
import {
  REGISTRY_ADDRESS,
  chainErrorMessage,
  evaluateCase,
  explorerAddress,
  explorerTx,
  readCase,
} from '../lib/genlayer';
import type { ChainCase } from '../lib/genlayer';
import type { CheckResult, EvaluationCase } from '../types';

const SAMPLE_NOTE = 'Illustrative check only; no page was fetched.';

type CaseDetailDialogProps = {
  item: EvaluationCase | null;
  walletAddress: string | null;
  onClose: () => void;
  onNotify: (message: string, tone: ToastTone) => void;
  onChainEvaluated: (id: string) => void;
};

export function CaseDetailDialog({
  item,
  walletAddress,
  onClose,
  onNotify,
  onChainEvaluated,
}: CaseDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const [chainCase, setChainCase] = useState<ChainCase | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluateTx, setEvaluateTx] = useState<string | null>(null);

  const caseId = item?.caseId ?? null;
  const isOnChain = item?.status === 'onchain' && Boolean(caseId);

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
    setChainCase(null);
    setChainError(null);
    setEvaluating(false);
    setEvaluateTx(null);
  }, [item?.id]);

  const loadChainCase = useCallback(async (id: string) => {
    setChainLoading(true);
    setChainError(null);
    try {
      setChainCase(await readCase(id));
    } catch (error) {
      setChainError(chainErrorMessage(error));
    } finally {
      setChainLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!caseId || item?.status !== 'onchain') return;
    void loadChainCase(caseId);
  }, [caseId, item?.status, loadChainCase]);

  async function handleCopy(text: string, label: string) {
    const copied = await copyText(text);
    onNotify(
      copied ? `${label} copied.` : `Could not copy the ${label.toLowerCase()}. Copy it manually instead.`,
      copied ? 'success' : 'error',
    );
  }

  async function handleEvaluate() {
    if (!item?.caseId || !walletAddress || evaluating) return;
    setEvaluating(true);
    try {
      const { txHash } = await evaluateCase(walletAddress, item.caseId);
      setEvaluateTx(txHash);
      onChainEvaluated(item.id);
      await loadChainCase(item.caseId);
      onNotify('Evaluation recorded on Studionet.', 'success');
    } catch (error) {
      onNotify(chainErrorMessage(error), 'error');
    } finally {
      setEvaluating(false);
    }
  }

  const spec = chainCase?.spec;
  const chainResult = chainCase?.result ?? null;
  const title = spec?.title ?? item?.title ?? '';
  const siteUrl = spec?.site_url ?? item?.url ?? '';
  const creator = spec?.creator ?? item?.creator ?? '';
  const criteria = isOnChain ? spec?.criteria ?? [] : item?.criteria ?? [];
  const checks = isOnChain ? chainResult?.checks ?? [] : item?.checks ?? [];
  const passedCount = checks.filter((check) => check.passed).length;
  const evaluated = isOnChain ? spec?.evaluated ?? false : false;
  const checkCount = isOnChain
    ? spec?.criteria.length ?? item?.criteriaCount ?? 0
    : item?.criteria.length ?? 0;
  const isCreator =
    Boolean(walletAddress) &&
    Boolean(creator) &&
    walletAddress!.toLowerCase() === creator.toLowerCase();

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
            {isOnChain ? 'STUDIONET CASE' : 'ILLUSTRATIVE SAMPLE'}
          </span>
          <button className="icon-button" type="button" aria-label="Close details" onClick={onClose}>
            ×
          </button>
        </div>

        {item ? (
          <div id="detail-content">
            <h2 id="detail-title">{title}</h2>
            <div className="detail-url-row">
              <span className="detail-url">{siteUrl}</span>
              <button
                className="detail-copy"
                type="button"
                onClick={() => void handleCopy(siteUrl, 'Website URL')}
              >
                Copy URL
              </button>
            </div>

            {isOnChain ? (
              <div className="detail-address-row">
                <span>
                  Registry case <code>#{item.caseId}</code>
                </span>
                <button
                  className="detail-copy"
                  type="button"
                  onClick={() => void handleCopy(item.caseId ?? '', 'Case id')}
                >
                  Copy id
                </button>
              </div>
            ) : null}

            {isOnChain ? (
              <div className="detail-links">
                {REGISTRY_ADDRESS ? (
                  <a href={explorerAddress(REGISTRY_ADDRESS)} target="_blank" rel="noreferrer">
                    Registry on explorer ↗
                  </a>
                ) : null}
                {evaluateTx ? (
                  <a href={explorerTx(evaluateTx)} target="_blank" rel="noreferrer">
                    Evaluation tx ↗
                  </a>
                ) : null}
                <button
                  className="detail-copy"
                  type="button"
                  disabled={chainLoading || !item.caseId}
                  onClick={() => item.caseId && void loadChainCase(item.caseId)}
                >
                  {chainLoading ? 'Refreshing…' : 'Refresh'}
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
                    : 'Illustrative result'}
                </strong>
                <small>
                  {isOnChain
                    ? spec
                      ? `Opened by ${shortAddress(spec.creator)} · validators compare every check`
                      : 'Reading the registry…'
                    : 'Sample data — not fetched from the website'}
                </small>
              </span>
              <span className="detail-score">
                {isOnChain
                  ? chainResult
                    ? `${passedCount}/${checkCount}`
                    : '—'
                  : `${passedCount}/${checkCount}`}
              </span>
            </div>

            {chainLoading ? <p className="detail-note">Reading the case from Studionet…</p> : null}
            {chainError ? (
              <p className="wallet-alert wallet-alert--error" role="alert">
                {chainError}
              </p>
            ) : null}

            {isOnChain && evaluated ? (
              <p className="detail-note">
                {chainResult?.all_passed
                  ? 'Every agreed criterion was met.'
                  : `${passedCount} of ${checkCount} criteria were met.`}
              </p>
            ) : null}

            {isOnChain ? (
              <div className="consensus-box">
                <div className="consensus-head">
                  <span>AI CONSENSUS</span>
                  <span className={evaluated ? 'consensus-state done' : 'consensus-state'}>
                    {evaluated ? 'Agreed and recorded' : 'Not run yet'}
                  </span>
                </div>
                <ol className="consensus-steps">
                  <li>
                    <span className="consensus-step-index">01</span>
                    <div>
                      <strong>The contract reads the page itself</strong>
                      <small>
                        gl.nondet.web.render fetches {siteUrl} inside the non-deterministic block —
                        no oracle, no off-chain worker.
                      </small>
                    </div>
                  </li>
                  <li>
                    <span className="consensus-step-index">02</span>
                    <div>
                      <strong>
                        One LLM pass for {checkCount} {checkCount === 1 ? 'criterion' : 'criteria'}
                      </strong>
                      <small>
                        The prompt asks for exactly one boolean per agreed criterion, with the page
                        capture marked as untrusted data.
                      </small>
                    </div>
                  </li>
                  <li>
                    <span className="consensus-step-index">03</span>
                    <div>
                      <strong>Validators agree on every boolean</strong>
                      <small>
                        {evaluated
                          ? `Independent validators repeated the read and matched all ${checkCount} answers.`
                          : 'Independent validators repeat the read; a disagreement records nothing.'}
                      </small>
                    </div>
                  </li>
                  <li>
                    <span className="consensus-step-index">04</span>
                    <div>
                      <strong>Deterministic write, once</strong>
                      <small>
                        {evaluated
                          ? 'Only ids and booleans were stored; the model’s prose is deliberately kept off chain.'
                          : 'Nothing is written until validators agree, and only the case owner can trigger it.'}
                      </small>
                    </div>
                  </li>
                </ol>
              </div>
            ) : null}

            <div className="detail-section-title">ACCEPTANCE CHECKS · {pad2(checkCount)}</div>

            {criteria.map((criterion, index) => {
              const check = checks[index];
              const passed = Boolean(check?.passed);
              const mark = isOnChain
                ? evaluated
                  ? passed
                    ? '✓'
                    : '×'
                  : '·'
                : passed
                  ? '✓'
                  : '×';
              const note = isOnChain
                ? evaluated
                  ? passed
                    ? 'Validators agreed this criterion is met.'
                    : 'Validators agreed this criterion is not met.'
                  : 'Pending a GenLayer evaluation.'
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
                ? 'This result lives in the SpecProof registry on Studionet. Only the wallet that opened the case can record it, it happens once, and nobody can change it afterwards.'
                : 'This is illustrative UI data to demonstrate the result format. It is not a live inspection, validator decision, or on-chain result.'}
            </div>

            {isOnChain && !evaluated && spec && isCreator ? (
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

            {isOnChain && !evaluated && spec && !isCreator ? (
              <p className="detail-note">Only the wallet that opened this case can evaluate it.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
