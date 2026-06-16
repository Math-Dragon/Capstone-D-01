export default function EmptyState({ icon = '📋', title, description, action, onAction, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-primary-50/60 border border-primary-100" role="status">
      {icon && <span className="text-4xl mb-3">{icon}</span>}
      {title && <p className="text-primary-500 font-medium mb-1">{title}</p>}
      {description && <p className="text-sm text-primary-400 mb-4">{description}</p>}
      {action && onAction && actionLabel && (
        <button onClick={onAction} className="btn-primary text-sm" type="button">
          {actionLabel}
        </button>
      )}
      {action && !onAction && actionLabel && (
        <div className="text-sm font-semibold text-primary-500 underline hover:text-primary-700 transition-colors">
          {action}
        </div>
      )}
    </div>
  );
}
