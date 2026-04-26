import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-primary-100 mt-auto">
      <div className="container py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-900 flex items-center justify-center text-white font-bold text-sm">
                AI
              </div>
              <span className="font-semibold text-primary-900">AI Learning Plan</span>
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
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary-900 mb-4">Akun</h4>
            <ul className="space-y-2">
              <li><Link to="/login" className="text-sm text-primary-500 hover:text-primary-900 transition-colors">Masuk</Link></li>
              <li><Link to="/register" className="text-sm text-primary-500 hover:text-primary-900 transition-colors">Daftar</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-primary-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-primary-500">
            &copy; {currentYear} AI Learning Plan. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}