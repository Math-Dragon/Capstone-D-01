import { Link } from 'react-router-dom';
import StepUpLogo from '../components/ui/StepUpLogo';

const FEATURE_ITEMS = [
  {
    title: 'AI-Powered Planning',
    description: 'Dapatkan rencana belajar yang dipersonalisasi oleh AI berdasarkan target dan waktu luangmu.',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    title: 'Jadwal Terstruktur',
    description: 'Tugas dipecah menjadi sesi harian dengan durasi dan slot waktu yang realistis.',
    iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  },
  {
    title: 'Tracking Progres',
    description: 'Pantau perkembangan belajarmu dengan visualisasi mingguan dan statistik.',
    iconPath: 'M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z',
  },
];

const STAT_ITEMS = [
  { value: 'AI', label: 'Learning Coach' },
  { value: '24/7', label: 'Akses Kapan Saja' },
  { value: '100%', label: 'Gratis' },
  { value: 'Tak terbatas', label: 'Target Belajar' },
];

const HOW_IT_WORKS_ITEMS = [
  { step: '1', title: 'Buat Target', desc: 'Tulis goal belajarmu, misalnya "Menguasai React Hooks dalam 2 minggu".' },
  { step: '2', title: 'AI Susun Rencana', desc: 'AI memecah target menjadi tugas harian dengan durasi dan jadwal yang realistis.' },
  { step: '3', title: 'Kerjakan dan Track', desc: 'Selesaikan tugas, pantau progres, dan minta saran baru kapan saja.' },
];

function FeatureIcon({ path }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path} />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50/30" />
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary-100/70 to-transparent" />
          <div className="absolute right-8 top-10 h-40 w-40 rounded-full border border-primary-100/80 bg-white/70" />
        </div>

        <div className="container py-16 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex justify-center">
              <StepUpLogo showTagline size="lg" />
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-medium text-primary-700">
              <span className="h-2 w-2 rounded-full bg-accent-500" />
              AI Learning Coach untuk Bootcamp
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight text-primary-900 sm:text-5xl lg:text-6xl">
              Rencanakan Belajarmu
              <span className="bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
                {' '}dengan AI
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-primary-500 sm:text-xl">
              Buat rencana belajar yang terstruktur dan konsisten. AI membantu menyusun jadwal, memecah target, dan melacak progresmu.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/register"
                className="w-full rounded-xl bg-primary-900 px-8 py-4 font-semibold text-white transition-colors duration-200 hover:bg-primary-800 sm:w-auto"
              >
                Mulai Sekarang - Gratis
              </Link>
              <Link
                to="/login"
                className="w-full rounded-xl border-2 border-primary-200 bg-white px-8 py-4 font-semibold text-primary-700 transition-colors duration-200 hover:border-primary-300 hover:bg-primary-50 sm:w-auto"
              >
                Sudah Punya Akun
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:mt-20 sm:grid-cols-4 sm:gap-6">
            {STAT_ITEMS.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-primary-100 bg-white p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-primary-900 sm:text-3xl">{stat.value}</div>
                <div className="mt-1 text-sm text-primary-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-primary-900 sm:text-4xl">
              Semua yang Kamu Butuhkan
            </h2>
            <p className="text-lg text-primary-500">
              Dari perencanaan hingga tracking, semua dalam satu platform.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            {FEATURE_ITEMS.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-primary-100 bg-primary-50/40 p-6 transition-all duration-300 hover:border-primary-200 hover:shadow-md sm:p-8"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-900 text-white transition-transform duration-300 group-hover:scale-105">
                  <FeatureIcon path={feature.iconPath} />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-primary-900">
                  {feature.title}
                </h3>
                <p className="leading-relaxed text-primary-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-primary-900 sm:text-4xl">
              Cara Kerjanya
            </h2>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {HOW_IT_WORKS_ITEMS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-900 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-primary-900">{item.title}</h3>
                <p className="text-sm text-primary-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-primary-900 px-6 py-12 sm:px-12 sm:py-16 lg:py-20">
            <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-primary-800/80 to-transparent" />

            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
                Siap Memulai?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-primary-200">
                Bergabung dengan peserta bootcamp lainnya yang sudah merencanakan belajarnya dengan AI.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/register"
                  className="w-full rounded-xl bg-white px-8 py-4 font-semibold text-primary-900 transition-colors duration-200 hover:bg-primary-50 sm:w-auto"
                >
                  Buat Akun Gratis
                </Link>
                <Link
                  to="/login"
                  className="w-full rounded-xl border-2 border-primary-600 px-8 py-4 font-semibold text-white transition-colors duration-200 hover:bg-primary-800 sm:w-auto"
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
