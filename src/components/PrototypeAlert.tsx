type PrototypeAlertProps = {
  onDismiss: () => void;
};

export function PrototypeAlert({ onDismiss }: PrototypeAlertProps) {
  return (
    <div className="prototype-alert" role="note">
      <span className="alert-icon" aria-hidden="true">
        i
      </span>
      <p>
        <strong>Studionet is live.</strong> Open a case from your wallet and it becomes a record in
        the SpecProof registry, readable by anyone. Only the wallet that opened it can evaluate it,
        and a result is written once.
      </p>
      <button type="button" className="alert-dismiss" aria-label="Dismiss notice" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
