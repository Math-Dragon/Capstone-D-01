import { Link } from 'react-router-dom';
import StepUpLogo from '../components/ui/StepUpLogo';

export default function HomePage() {
  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'AI-Powered Planning',
      description: 'Dapatkan rencana belajar yang dipersonalisasi oleh AI berdasarkan target dan waktu luangmu.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Jadwal Terstruktur',
      description: 'Tugas dipecah menjadi sesi harian dengan durasi dan slot waktu yang realistis.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Tracking Progres',
      description: 'Pantau perkembangan belajarmu dengan visualisasi mingguan dan statistik.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50/30" />
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/4 w-[600px] h-[600px] bg-primary-100/50 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-1/4 w-[400px] h-[400px] bg-accent-100/30 rounded-full blur-3xl" />
        </div>

        <div className="container py-16 sm:py-24 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-6 animate-fade-in">
              <StepUpLogo showTagline size="lg" />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
              AI Learning Coach untuk Bootcamp
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary-900 mb-6 animate-slide-up">
              Rencanakan Belajarmu
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-700 to-accent-600">
                {' '}dengan AI
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-primary-500 mb-10 max-w-2xl mx-auto animate-slide-up">
              Buat rencana belajar yang terstruktur dan konsisten. AI membantu menyusun jadwal, memecah target, dan melacak progresmu.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-white bg-primary-900 hover:bg-primary-800 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
              >
                Mulai Sekarang — Gratis
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-primary-700 bg-white border-2 border-primary-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200"
              >
                Sudah Punya Akun
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 sm:mt-24 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto animate-slide-up">
            {[
              { value: 'AI', label: 'Learning Coach' },
              { value: '24/7', label: 'Akses Kapan Saja' },
              { value: '100%', label: 'Gratis' },
              { value: '∞', label: 'Target Belajar' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-primary-100">
                <div className="text-2xl sm:text-3xl font-bold text-primary-900">{stat.value}</div>
                <div className="text-sm text-primary-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-primary-900 mb-4">
              Semua yang Kamu Butuhkan
            </h2>
            <p className="text-primary-500 text-lg">
              Dari perencanaan hingga tracking, semua dalam satu platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 sm:p-8 rounded-2xl bg-primary-50/50 border border-primary-100 hover:border-primary-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-900 text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-primary-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-primary-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-primary-900 mb-4">
              Cara Kerjanya
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Buat Target', desc: 'Tulis goal belajarmu, misalnya "Menguasai React Hooks dalam 2 minggu".' },
              { step: '2', title: 'AI Susun Rencana', desc: 'AI memecah target menjadi tugas harian dengan durasi dan jadwal yang realistis.' },
              { step: '3', title: 'Kerjakan & Track', desc: 'Selesaikan tugas, pantau progres, dan minta saran baru kapan saja.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary-900 text-white flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-primary-900 mb-2">{item.title}</h3>
                <p className="text-primary-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-primary-900 px-6 py-12 sm:px-12 sm:py-16 lg:py-20">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[300px] h-[300px] bg-primary-700 rounded-full blur-3xl opacity-50" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[200px] h-[200px] bg-accent-600 rounded-full blur-2xl opacity-30" />

            <div className="relative max-w-2xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Siap Memulai?
              </h2>
              <p className="text-primary-200 text-lg mb-8 max-w-xl mx-auto">
                Bergabung dengan peserta bootcamp lainnya yang sudah merencanakan belajarnya dengan AI.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-primary-900 bg-white hover:bg-primary-50 transition-all duration-200"
                >
                  Buat Akun Gratis
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-white border-2 border-primary-600 hover:bg-primary-800 transition-all duration-200"
                >
                  Masuk
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}