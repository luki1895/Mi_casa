import Alert from "../ui/Alert";

function ErrorMessage({ mensaje, children, onRetry }) {
  return (
    <Alert type="error" onRetry={onRetry}>
      {mensaje || children}
    </Alert>
  );
}

export default ErrorMessage;
