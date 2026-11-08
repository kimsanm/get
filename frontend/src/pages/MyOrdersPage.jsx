import React, { useState, useEffect } from 'react';
import api from '../api';
import { Mail, KeyRound, Copy, Check, RefreshCw, AlertCircle, Eye, EyeOff, ShieldCheck, Inbox, Clock } from 'lucide-react';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMail, setActiveMail] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResult, setOtpResult] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePassword = (mailId) => {
    setShowPassword(prev => ({ ...prev, [mailId]: !prev[mailId] }));
  };

  const handleGetOtp = async (mail) => {
    setActiveMail(mail);
    setOtpLoading(true);
    setOtpError(null);
    setOtpResult(null);

    try {
      const res = await api.post('/api/otp/fetch', { mailId: mail.id });
      setOtpResult(res.data);
    } catch (err) {
      setOtpError(err.response?.data?.error || err.response?.data?.details || 'Failed to connect via IMAP. Make sure credentials are active.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-3">
            <KeyRound className="w-8 h-8 text-sky-400" />
            <span>Purchased Accounts & OTP Hub</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Access your purchased mailboxes and trigger real-time IMAP OTP verification retrieval.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="self-start md:self-auto flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh List</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Account List (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-900 rounded-2xl animate-pulse border border-slate-800"></div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800 p-8">
              <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-300">No Purchased Accounts</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6">You haven't bought any email accounts yet.</p>
              <a
                href="/"
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-sky-600/20"
              >
                <span>Browse Store & Buy</span>
              </a>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800/80 text-xs text-slate-400 mb-4 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sky-400 font-semibold">{order.order_code}</span>
                    <span>•</span>
                    <span className="text-slate-300 font-medium">{order.product_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items.map(mail => {
                    const isSelected = activeMail?.id === mail.id;
                    return (
                      <div
                        key={mail.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-sky-950/30 border-sky-500/50 shadow-md shadow-sky-900/20'
                            : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Mail Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm font-bold text-white break-all">{mail.email}</span>
                              <button
                                onClick={() => handleCopy(mail.email, `email_${mail.id}`)}
                                title="Copy email"
                                className="text-slate-400 hover:text-sky-400 transition"
                              >
                                {copiedKey === `email_${mail.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            {/* Password & Extra info */}
                            <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-slate-500">Pass:</span>
                                <span>{showPassword[mail.id] ? mail.password : '••••••••'}</span>
                                <button
                                  onClick={() => togglePassword(mail.id)}
                                  className="text-slate-500 hover:text-slate-300"
                                >
                                  {showPassword[mail.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => handleCopy(mail.password, `pass_${mail.id}`)}
                                  className="text-slate-500 hover:text-sky-400"
                                >
                                  {copiedKey === `pass_${mail.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>

                              {mail.recovery_email && (
                                <div className="hidden sm:inline-block text-slate-500">
                                  Rec: <span className="text-slate-400">{mail.recovery_email}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Get OTP Button */}
                          <button
                            onClick={() => handleGetOtp(mail)}
                            disabled={otpLoading && activeMail?.id === mail.id}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition ${
                              isSelected
                                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/20'
                            }`}
                          >
                            {otpLoading && activeMail?.id === mail.id ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Reading IMAP...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span>Get OTP Code</span>
                              </>
                            )}
                          </button>
                        </div>

                        {mail.extra_info && (
                          <div className="text-[11px] font-mono text-slate-500 bg-slate-900/60 px-2 py-1 rounded border border-slate-800/40">
                            Extra: {mail.extra_info}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Live OTP Reader Monitor (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-24">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Live OTP Reader</h3>
                  <p className="text-xs text-slate-400 font-mono">Protocol: IMAP / TLS</p>
                </div>
              </div>
              {activeMail && (
                <button
                  onClick={() => handleGetOtp(activeMail)}
                  disabled={otpLoading}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="Check Mailbox Again"
                >
                  <RefreshCw className={`w-4 h-4 ${otpLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {!activeMail ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-300">Select an Account</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Click the <strong className="text-sky-400">"Get OTP Code"</strong> button next to any mail on the left to read its latest verification code.
                </p>
              </div>
            ) : otpLoading ? (
              <div className="text-center py-14">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h4 className="text-sm font-semibold text-white">Connecting to Mailbox...</h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">{activeMail.email}</p>
                <p className="text-xs text-slate-500 mt-3">Accessing IMAP server & scanning recent messages for OTP codes...</p>
              </div>
            ) : otpError ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 space-y-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm">IMAP Connection Error</h5>
                    <p className="text-xs text-red-300/90 mt-1">{otpError}</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg font-mono">
                  Target: {activeMail.email}
                </div>
                <button
                  onClick={() => handleGetOtp(activeMail)}
                  className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-semibold transition"
                >
                  Retry IMAP Fetch
                </button>
              </div>
            ) : otpResult ? (
              <div className="space-y-5">
                {/* Email account targeted */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-500">Target Email: </span>
                  <span className="font-mono text-slate-200 font-semibold">{otpResult.email}</span>
                </div>

                {/* Primary OTP Detected Banner */}
                {otpResult.latestOtp ? (
                  <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 text-center shadow-lg shadow-emerald-950/30">
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                      Verification Code Detected
                    </span>
                    <div className="my-3 font-mono text-4xl sm:text-5xl font-extrabold tracking-widest text-emerald-300 select-all">
                      {otpResult.latestOtp}
                    </div>
                    <button
                      onClick={() => handleCopy(otpResult.latestOtp, 'otp_card')}
                      className="inline-flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/30"
                    >
                      {copiedKey === 'otp_card' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedKey === 'otp_card' ? 'Copied to Clipboard!' : 'Copy OTP Code'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center text-xs">
                    <p className="font-semibold">No OTP pattern found in the latest message.</p>
                    <p className="text-slate-400 mt-1">Check the full email messages below or send your OTP again.</p>
                  </div>
                )}

                {/* Recent Messages Feed */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Recent Messages ({otpResult.messages?.length || 0})
                  </h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {otpResult.messages?.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-6">Mailbox is currently empty.</div>
                    ) : (
                      otpResult.messages?.map((msg, idx) => (
                        <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-semibold text-slate-300 truncate max-w-[200px]">{msg.from}</span>
                            <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                              {msg.date ? new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <div className="font-medium text-slate-200">{msg.subject}</div>
                          {msg.otp && (
                            <div className="inline-block bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded font-mono font-bold text-xs">
                              Code: {msg.otp}
                            </div>
                          )}
                          <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-800/40">
                            {msg.snippet}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleGetOtp(activeMail)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center space-x-2 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Mailbox for New OTP</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

