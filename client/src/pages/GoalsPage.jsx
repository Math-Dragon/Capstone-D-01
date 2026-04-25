export default function GoalsPage() {
  return (
    <div className="goals-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Target Belajar</h2>
        <button className="btn-primary">+ Tambah Target</button>
      </div>
      
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
        <h3>Belum ada target belajar</h3>
        <p className="text-muted">Mulai dengan membuat target belajar pertamamu.</p>
      </div>
    </div>
  );
}
