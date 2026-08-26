import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { resetPasswordSchema } from '../schemas';
import authService from '../services/authService';
import { STORAGE_KEYS } from '../../../utils/constants';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const resetToken = sessionStorage.getItem(STORAGE_KEYS.RESET_TOKEN);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => { if (!resetToken) navigate('/forgot-password'); }, [resetToken, navigate]);

  const onSubmit = async (data) => {
    setLoading(true); setError('');
    try {
      const result = await authService.resetPassword({ resetToken, password: data.password });
      sessionStorage.removeItem(STORAGE_KEYS.RESET_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.FORGOT_PASSWORD_IDENTIFIER);
      sessionStorage.removeItem(STORAGE_KEYS.FORGOT_PASSWORD_CHANNEL);
      setSuccess(result.message || 'Password berhasil diperbarui.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message || 'Gagal memperbarui password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary-900 mb-2">Buat password baru</h1>
            <p className="text-primary-500">Gunakan password baru yang kuat dan belum pernah kamu pakai di StepUp.</p>
          </div>
          {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm" role="alert">{error}</div>}
          {success && <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm" role="status">{success}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-primary-700 mb-2">Password baru</label>
              <input id="new-password" type="password" className="input" {...register('password')} />
              {errors.password && <p className="mt-2 text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-primary-700 mb-2">Konfirmasi password</label>
              <input id="confirm-password" type="password" className="input" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="mt-2 text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={loading || Boolean(success)} className="w-full py-3.5 px-4 rounded-xl font-semibold bg-primary-900 text-white hover:bg-primary-800 disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan password baru'}</button>
          </form>
        </div>
        <p className="text-center mt-6 text-primary-600"><Link to="/login" className="font-semibold text-primary-900 hover:underline">Kembali ke login</Link></p>
      </div>
    </div>
  );
}
