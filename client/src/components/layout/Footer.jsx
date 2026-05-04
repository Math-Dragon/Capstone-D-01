import { Link } from 'react-router-dom';
import StepUpLogo from '../ui/StepUpLogo';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-primary-100 mt-auto">
      <div className="container py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block">
              <StepUpLogo size="sm" />
            </Link>
            <p className="mt-3 text-sm text-primary-500 leading-relaxed">
              Aplikasi web yang membantu peserta bootcamp merencanakan belajar secara konsisten, dengan bantuan AI.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-primary-900 mb-4">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/goals" className="text-sm text-primary-500 hover:text-primary-900 transition-colors">Goals</Link></li>
              <li><Link to="/calendar" className="text-sm text-primary-500 hover:text-primary-900 transition-colors">Kalender</Link></li>
              <li><Link to="/progress" className="text-sm text-primary-500 hover:text-primary-900 transition-colors">Progress</Link></li>
              <li><Link to="/coach" className="text-sm text-primary-500 hover:text-primary-900 transition-colors">Coach</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary-900 mb-4">Sumber Daya</h4>
            <ul className="space-y-2">
              <li><span className="text-sm text-primary-300 cursor-not-allowed">Panduan</span></li>
              <li><span className="text-sm text-primary-300 cursor-not-allowed">Tutorial</span></li>
              <li><span className="text-sm text-primary-300 cursor-not-allowed">Contoh Proyek</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary-900 mb-4">Hubungi</h4>
            <ul className="space-y-2">
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-500 hover:text-primary-900 transition-colors">GitHub</a></li>
              <li><span className="text-sm text-primary-300 cursor-not-allowed">Forum</span></li>
              <li><span className="text-sm text-primary-300 cursor-not-allowed">Email</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-primary-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-primary-500">
            &copy; {currentYear} StepUp. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-sm text-primary-300 cursor-not-allowed">Kebijakan Privasi</span>
            <span className="text-sm text-primary-300 cursor-not-allowed">Ketentuan Layanan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
