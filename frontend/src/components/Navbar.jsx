import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ShieldCheck, KeyRound, LogOut, Wallet, User, LayoutDashboard, ShoppingCart } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-sky-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                MailStore & OTP
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono">
                Telegram Bot Synced
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Buy Accounts</span>
            </Link>

            {user && (
              <Link
                to="/orders"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/orders') 
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>My Accounts & OTP</span>
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin') 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'text-amber-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Panel</span>
              </Link>
            )}
          </div>

          {/* User Section */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Balance Badge */}
                <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-lg text-sm">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-400 font-mono">
                    ${Number(user.balance || 0).toFixed(2)}
                  </span>
                </div>

                <div className="hidden md:flex items-center space-x-2 text-slate-300 text-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-200">{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono uppercase">
                      Admin
                    </span>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm shadow-sky-600/30 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

