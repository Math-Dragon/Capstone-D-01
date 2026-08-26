import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { verifyOtpSchema } from '../schemas';
import authService from '../services/authService';
import { STORAGE_KEYS } from '../../../utils/constants';

const COOLDOWN_SECONDS = 60;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const identifier = sessionStorage.getItem(STORAGE_KEYS.FORGOT_PASSWORD_IDENTIFIER);
  const channel = sessionStorage.getItem(STORAGE_KEYS.FORGOT_PASSWORD_CHANNEL);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(verifyOtpSchema) });

  useEffect(() => { if (!identifier || !channel) navigate('/forgot-password'); }, [identifier, channel, navigate]);
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async (data) => {
    setLoading(true); setError('');
    try {
      const result = await authService.verifyPasswordResetOtp({ identifier, channel, otp: data.otp });
      sessionStorage.setItem(STORAGE_KEYS.RESET_TOKEN, result.resetToken);
      navigate('/reset-password');
    } catch (err) {
      setError(err.message || 'Kode OTP tidak valid atau sudah kedaluwarsa.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResendLoading(true); setError('');
    try { await authService.requestPasswordReset({ identifier, channel }); setCooldown(COOLDOWN_SECONDS); }
    catch (err) { setError(err.message || 'Gagal mengirim ulang OTP.'); }
    finally { setResendLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary-900 mb-2">Masukkan kode OTP</h1>
            <p className="text-primary-500">Cek {channel === 'sms' ? 'SMS' : 'email'} kamu dan masukkan 6 digit kode.</p>
          </div>
          {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm" role="alert">{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-primary-700 mb-2">Kode OTP</label>
              <input id="otp" type="text" inputMode="numeric" maxLength={6} placeholder="123456" className="input tracking-widest text-center" {...register('otp')} />
              {errors.otp && <p className="mt-2 text-sm text-red-500">{errors.otp.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 px-4 rounded-xl font-semibold bg-primary-900 text-white hover:bg-primary-800 disabled:opacity-50">{loading ? 'Memverifikasi...' : 'Verifikasi OTP'}</button>
          </form>
          <button type="button" onClick={handleResend} disabled={resendLoading || cooldown > 0} className="w-full mt-4 py-2 text-sm text-primary-700 hover:underline disabled:opacity-50">{cooldown > 0 ? `Kirim ulang dalam ${cooldown}s` : resendLoading ? 'Mengirim...' : 'Kirim ulang OTP'}</button>
        </div>
        <p className="text-center mt-6 text-primary-600"><Link to="/forgot-password" className="font-semibold text-primary-900 hover:underline">Ganti email/nomor</Link></p>
      </div>
    </div>
  );
}
