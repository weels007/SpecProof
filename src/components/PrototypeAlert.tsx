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
        <strong>Prototype mode.</strong> Drafts stay in this browser. No URL is fetched and no
        GenLayer transaction is submitted yet.
      </p>
      <button type="button" className="alert-dismiss" aria-label="Dismiss notice" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
