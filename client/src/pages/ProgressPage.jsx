export default function ProgressPage() {
  return (
    <div className="progress-page">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Analisis Progres</h2>
        <p className="text-muted">Lihat pencapaian dan tren belajarmu.</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3>Statistik Penyelesaian</h3>
          <p className="text-muted">Lengkapi tugas untuk melihat analisis.</p>
        </div>
        <div className="card">
          <h3>Tren Belajar</h3>
          <p className="text-muted">Visualisasi tren akan muncul di sini.</p>
        </div>
      </div>
    </div>
  );
}
