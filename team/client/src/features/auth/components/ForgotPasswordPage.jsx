import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPasswordSchema } from '../schemas';
import authService from '../services/authService';
import { STORAGE_KEYS } from '../../../utils/constants';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { channel: 'email', identifier: '' },
  });

  const channel = watch('channel');

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      await authService.requestPasswordReset(data);
      sessionStorage.setItem(STORAGE_KEYS.FORGOT_PASSWORD_IDENTIFIER, data.identifier);
      sessionStorage.setItem(STORAGE_KEYS.FORGOT_PASSWORD_CHANNEL, data.channel);
      navigate('/forgot-password/verify');
    } catch (err) {
      setError(err.message || 'Permintaan gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary-900 mb-2">Lupa password?</h1>
            <p className="text-primary-500">Masukkan email atau nomor telepon yang terhubung dengan akun StepUp kamu.</p>
          </div>
          {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm" role="alert">{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <span className="block text-sm font-medium text-primary-700 mb-2">Channel OTP</span>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer has-[:checked]:border-primary-900">
                  <input type="radio" value="email" {...register('channel')} /><span>Email</span>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer has-[:checked]:border-primary-900">
                  <input type="radio" value="sms" {...register('channel')} /><span>SMS</span>
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="forgot-identifier" className="block text-sm font-medium text-primary-700 mb-2">{channel === 'sms' ? 'Nomor telepon (E.164)' : 'Email'}</label>
              <input id="forgot-identifier" type={channel === 'sms' ? 'tel' : 'email'} placeholder={channel === 'sms' ? '+6281234567890' : 'nama@email.com'} className="input" {...register('identifier')} />
              {errors.identifier && <p className="mt-2 text-sm text-red-500">{errors.identifier.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 px-4 rounded-xl font-semibold bg-primary-900 text-white hover:bg-primary-800 disabled:opacity-50">{loading ? 'Memuat...' : 'Kirim kode OTP'}</button>
          </form>
        </div>
        <p className="text-center mt-6 text-primary-600"><Link to="/login" className="font-semibold text-primary-900 hover:underline">Kembali ke login</Link></p>
      </div>
    </div>
  );
}
