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
        <strong>Studionet is live.</strong> Deploy a case from your wallet to let validators record
        it, or keep it as a local draft. Only the creator wallet can evaluate, and a result is
        written once.
      </p>
      <button type="button" className="alert-dismiss" aria-label="Dismiss notice" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
