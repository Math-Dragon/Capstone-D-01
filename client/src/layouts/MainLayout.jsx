import { Outlet } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import CheckInGateway from '../components/CheckInGateway';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <CheckInGateway>
          <Outlet />
        </CheckInGateway>
      </main>
      <Footer />
    </div>
  );
}