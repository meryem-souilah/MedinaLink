export default function Toast({ toasts }) {
  if (!toasts.length) return null;
  const icons = { success: '✔', error: '✕', info: 'ℹ', warning: '⚠' };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          <span className="toast-icon">{icons[t.type] || 'ℹ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
