import { AlertCircle, LoaderCircle } from "lucide-react";

export function LoadingState({
  label = "Loading your forms",
}: {
  label?: string;
}) {
  return (
    <div className="query-state" role="status">
      <LoaderCircle className="spin" size={24} />
      <p>{label}…</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="query-state" role="alert">
      <AlertCircle size={26} />
      <h2>We couldn’t load this.</h2>
      <p>{message}</p>
      <button className="button button-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
