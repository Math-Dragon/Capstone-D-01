import { Outlet } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
<<<<<<< HEAD
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-primary-900 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Langsung ke konten utama
      </a>
      <Header />
      <main id="main-content" className="flex-1 container py-8" role="main" aria-label="Konten utama">
=======
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Lewati ke konten utama
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 container py-8">
>>>>>>> dev
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
