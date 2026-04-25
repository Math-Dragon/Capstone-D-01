export default function TaskSkeleton({ count = 3 }) {
  return (
    <div className="skeleton-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card card" style={{ padding: '1.5rem', opacity: 0.6, animation: 'pulse 1.5s infinite' }}>
          <div className="skeleton-line" style={{ width: '60%', height: '1.5rem', backgroundColor: '#e2e8f0', marginBottom: '0.5rem', borderRadius: '4px' }} />
          <div className="skeleton-line" style={{ width: '30%', height: '1rem', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
