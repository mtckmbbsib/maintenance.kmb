import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Wrench, Loader2 } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Append dummy domain to use Supabase email auth behind the scenes
      const authEmail = `${username.toLowerCase()}@bsib.com`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error) throw error;
      
      if (data.user) {
        navigate('/');
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' 
        ? 'Username atau password salah' 
        : 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-end p-4 sm:p-8 md:p-12 lg:p-24 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url('/bg-dummy.png')` }}
    >
      {/* Dark overlay to make text readable and add cinematic effect */}
      <div className="absolute inset-0 bg-black/40 bg-gradient-to-r from-black/20 via-transparent to-black/80"></div>

      {/* Login Box */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 sm:p-10 relative z-10 animate-fade-in border border-white/20">
        <div className="flex flex-col items-center mb-8">
          {/* Logo container */}
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-sm">
            <Wrench size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">BSIB Maintenance</h1>
          <p className="text-gray-500 text-sm mt-1">Sistem Manajemen Terpadu</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 text-sm p-4 rounded mb-8">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
              placeholder="Masukkan username"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700">Kata Sandi</label>
              <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Lupa sandi?</a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/30 disabled:opacity-70 disabled:shadow-none disabled:cursor-not-allowed mt-8 text-base"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Masuk ke Sistem'}
          </button>
        </form>
        
        <div className="text-center mt-10 border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} PT Borneo Kencana Sakti
          </p>
        </div>
      </div>
    </div>
  );
};
