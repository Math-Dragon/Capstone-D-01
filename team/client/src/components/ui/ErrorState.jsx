export default function ErrorState({ message = 'Terjadi kesalahan.', helpText = 'Periksa koneksi, lalu coba lagi.', onRetry, retryLabel = 'Coba Lagi' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20" role="alert" aria-live="assertive">
      <div className="text-4xl mb-4">⚠️</div>
      <p className="text-primary-700 mb-2 text-center font-semibold">{message}</p>
      {helpText && <p className="text-primary-500 mb-4 text-center text-sm">{helpText}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-primary" type="button">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
