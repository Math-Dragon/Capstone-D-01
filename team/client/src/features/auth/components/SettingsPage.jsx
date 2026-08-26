import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { phoneVerifyConfirmSchema, phoneVerifyRequestSchema } from '../schemas';
import authService from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export default function SettingsPage() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');

  const phoneForm = useForm({
    resolver: zodResolver(phoneVerifyRequestSchema),
    defaultValues: { phoneNumber: '' },
  });

  const otpForm = useForm({
    resolver: zodResolver(phoneVerifyConfirmSchema),
    defaultValues: { phoneNumber: '', otp: '' },
  });

  useEffect(() => {
    if (user?.phoneVerified) {
      setStep('done');
    }
  }, [user]);

  const requestVerify = async (data) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await authService.requestPhoneVerification({ phoneNumber: data.phoneNumber });
      setPendingPhone(data.phoneNumber);
      otpForm.setValue('phoneNumber', data.phoneNumber);
      setStep('otp');
      setMessage(result.message || 'Kode verifikasi telah dikirim.');
    } catch (err) {
      setError(err.message || 'Gagal mengirim kode verifikasi.');
    } finally {
      setLoading(false);
    }
  };

  const confirmVerify = async (data) => {
    setLoading(true);
    setError('');
    try {
      await authService.confirmPhoneVerification({
        phoneNumber: data.phoneNumber,
        otp: data.otp,
      });
      await refreshProfile();
      setStep('done');
      setMessage('Nomor telepon berhasil diverifikasi.');
    } catch (err) {
      setError(err.message || 'Kode OTP tidak valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link to="/" className="text-sm text-primary-600 hover:underline">← Kembali</Link>
        <h1 className="text-2xl font-bold text-primary-900 mt-2">Akun & Keamanan</h1>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-primary-900">Email</h2>
          <p className="text-primary-600 mt-1">{user?.email}</p>
        </div>

        <div className="border-t border-primary-100 pt-6">
          <h2 className="font-semibold text-primary-900 mb-2">Nomor telepon</h2>
          {user?.phoneVerified ? (
            <p className="text-primary-600">{user.phoneNumber} · Terverifikasi</p>
          ) : (
            <>
              <p className="text-sm text-primary-500 mb-4">Verifikasi nomor telepon untuk reset password via SMS.</p>

              {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
              {message && <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">{message}</div>}

              {step === 'phone' && (
                <form onSubmit={phoneForm.handleSubmit(requestVerify)} className="space-y-4">
                  <input type="tel" placeholder="+6281234567890" className="input" {...phoneForm.register('phoneNumber')} />
                  {phoneForm.formState.errors.phoneNumber && (
                    <p className="text-sm text-red-500">{phoneForm.formState.errors.phoneNumber.message}</p>
                  )}
                  <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-primary-900 text-white disabled:opacity-50">
                    {loading ? 'Mengirim...' : 'Kirim kode verifikasi'}
                  </button>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={otpForm.handleSubmit(confirmVerify)} className="space-y-4">
                  <p className="text-sm text-primary-600">Kode dikirim ke {pendingPhone}</p>
                  <input type="hidden" {...otpForm.register('phoneNumber')} />
                  <input type="text" inputMode="numeric" maxLength={6} placeholder="123456" className="input" {...otpForm.register('otp')} />
                  {otpForm.formState.errors.otp && (
                    <p className="text-sm text-red-500">{otpForm.formState.errors.otp.message}</p>
                  )}
                  <div className="flex gap-3">
                    <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-primary-900 text-white disabled:opacity-50">Verifikasi</button>
                    <button type="button" onClick={() => setStep('phone')} className="px-4 py-2 rounded-xl border border-primary-200">Ganti nomor</button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
