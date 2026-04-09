import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Loader2 } from 'lucide-react';
// Import your new assets
import logo from './assets/logo1.jpg';
import bgImage from './assets/login-bg.jpg';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('https://capstone-backend-api-vh11.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      // Inside your Login.tsx fetch response...
      if (data.success) {
        // 1. Save both pieces of data to the browser memory!
        sessionStorage.setItem('userRole', data.role);
        sessionStorage.setItem('username', data.username);

        // 2. Send them to the right dashboard
        if (data.role.startsWith('Checker')) {
          navigate('/checker-panel'); // No need to pass { state } anymore!
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(data.message || 'Invalid credentials');
        setIsLoading(false);
      }
    } catch (err) {
      setError("Cannot connect to server.");
      setIsLoading(false);
    }
  };

  return (
    // Full screen background image
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center relative"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Dark blue overlay gradient to make text readable */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark/80 to-brand/60 backdrop-blur-sm"></div>

      {/* Login Card with "Frosted Glass" effect */}
      <div className="relative z-10 bg-white/90 p-8 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-md border border-white/50">

        {/* Logo & Title */}
        <div className="text-center mb-8">
          <img src={logo} alt="FAMS Logo" className="h-20 mx-auto mb-2 " />
          <h2 className="text-2xl font-bold text-brand-dark">Welcome Back</h2>
          <p className="text-slate-500 text-sm">Sign in to access the attendance system</p>
        </div>

        {error && (
          <div className="p-3 mb-6 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-dark/50" size={20} />
            <input
              type="text"
              placeholder="Username"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white/50 transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-dark/50" size={20} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white/50 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-brand transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-3 text-white bg-gradient-to-r from-brand-dark to-brand rounded-xl hover:from-brand hover:to-brand-light transition-all duration-300 font-bold shadow-lg shadow-brand/20 flex items-center justify-center disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          © 2026 Faculty Attendance Monitoring System
        </div>
      </div>
    </div>
  );
}