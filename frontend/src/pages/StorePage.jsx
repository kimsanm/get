import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Mail, CheckCircle2, AlertCircle, ShoppingCart, ShieldCheck, Zap, Copy, ExternalLink, Bot } from 'lucide-react';

export default function StorePage() {
  const { user, refreshBalance } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quantities, setQuantities] = useState({});
  const [purchasingId, setPurchasingId] = useState(null);
  const [orderModal, setOrderModal] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data.products);
      const initialQty = {};
      res.data.products.forEach(p => {
        initialQty[p.id] = 1;
      });
      setQuantities(initialQty);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleQtyChange = (productId, delta, maxStock) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(maxStock, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleBuy = async (product) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const qty = quantities[product.id] || 1;
    const totalCost = product.price * qty;

    if (user.balance < totalCost) {
      setErrorMsg(`Insufficient balance. You need $${totalCost.toFixed(2)} but currently have $${Number(user.balance).toFixed(2)}.`);
      return;
    }

    try {
      setPurchasingId(product.id);
      setErrorMsg('');
      const res = await api.post('/products/buy', {
        productId: product.id,
        quantity: qty
      });

      setOrderModal(res.data);
      await refreshBalance();
      await fetchProducts();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to complete purchase.');
    } finally {
      setPurchasingId(null);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const categories = [
    { id: 'all', label: 'All Accounts' },
    { id: 'outlook', label: 'Outlook / Hotmail' },
    { id: 'gmail', label: 'Gmail' },
    { id: 'rambler', label: 'Rambler.ru' }
  ];

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category?.toLowerCase() === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-900/40 via-indigo-900/40 to-slate-900 border border-sky-800/30 p-8 sm:p-10 mb-10 shadow-2xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-full text-xs font-semibold text-sky-400 mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Instant Delivery & IMAP OTP Hub</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Automated Mail Accounts <br />
            <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              With 1-Click OTP Retrieval
            </span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg mb-6 leading-relaxed">
            Purchase verified Outlook, Gmail, and custom domain email accounts. Access inboxes directly through our IMAP OTP engine or our synchronized Telegram Bot without logging in manually.
          </p>
          <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Private & Clean</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Zap className="w-4 h-4 text-sky-400" />
              <span>Real-Time IMAP Reading</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span>Telegram Bot Commands</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
          <div className="text-sm">
            <span className="font-semibold">Notice: </span>
            {errorMsg}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-6">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-slate-800/50 animate-pulse border border-slate-800"></div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800">
          <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-300">No mail accounts found in this category</h3>
          <p className="text-sm text-slate-500 mt-1">Check back later or contact admin to restock.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => {
            const inStock = product.stock > 0;
            const currentQty = quantities[product.id] || 1;
            const totalCost = (product.price * currentQty).toFixed(2);

            return (
              <div
                key={product.id}
                className="flex flex-col justify-between bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-sky-950/20"
              >
                <div>
                  {/* Header & Stock status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs uppercase tracking-wider font-bold text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2.5 py-1 rounded-md">
                      {product.category || 'General'}
                    </span>
                    <span
                      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                        inStock
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${inStock ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                      {inStock ? `${product.stock} in stock` : 'Out of Stock'}
                    </span>
                  </div>

                  {/* Title & Price */}
                  <h3 className="text-lg font-bold text-white mb-2 leading-snug">{product.name}</h3>
                  <div className="flex items-baseline space-x-2 mb-4">
                    <span className="text-3xl font-extrabold text-white">${Number(product.price).toFixed(2)}</span>
                    <span className="text-xs text-slate-400">/ account</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-400 mb-6 line-clamp-3 leading-relaxed">
                    {product.description || 'Fast IMAP connection enabled for instant OTP retrieval.'}
                  </p>

                  {/* IMAP Protocol Specs */}
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 text-xs text-slate-400 space-y-1 mb-6">
                    <div className="flex justify-between">
                      <span className="text-slate-500">IMAP Server:</span>
                      <span className="font-mono text-slate-300">{product.imap_host || 'Automatic'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Port / TLS:</span>
                      <span className="font-mono text-slate-300">{product.imap_port || 993} / SSL</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div>
                  {inStock && (
                    <div className="flex items-center justify-between bg-slate-950/80 rounded-xl p-2 border border-slate-800 mb-4">
                      <span className="text-xs font-medium text-slate-400 ml-2">Quantity:</span>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleQtyChange(product.id, -1, product.stock)}
                          disabled={currentQty <= 1}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <span className="text-sm font-bold font-mono text-white w-6 text-center">{currentQty}</span>
                        <button
                          onClick={() => handleQtyChange(product.id, 1, product.stock)}
                          disabled={currentQty >= product.stock}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center justify-center transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleBuy(product)}
                    disabled={!inStock || purchasingId === product.id}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {purchasingId === product.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>{inStock ? `Buy Now ($${totalCost})` : 'Out of Stock'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Purchase Success Modal */}
      {orderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Purchase Successful!</h3>
                <p className="text-xs text-slate-400">Order: {orderModal.orderCode}</p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 space-y-4 max-h-72 overflow-y-auto mb-6">
              {orderModal.items.map((item, idx) => (
                <div key={item.id} className="text-xs font-mono space-y-1.5 pb-3 border-b border-slate-800 last:border-b-0">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Account #{idx + 1}</span>
                    <button
                      onClick={() => handleCopy(`${item.email}|${item.password}${item.recovery_email ? `|${item.recovery_email}` : ''}`, idx)}
                      className="text-sky-400 hover:text-sky-300 flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedIndex === idx ? 'Copied!' : 'Copy Info'}</span>
                    </button>
                  </div>
                  <div className="text-white font-medium break-all">📧 {item.email}</div>
                  <div className="text-emerald-400">🔑 {item.password}</div>
                  {item.recovery_email && <div className="text-slate-400">🔄 Rec: {item.recovery_email}</div>}
                  {item.extra_info && <div className="text-amber-400/80">ℹ️ {item.extra_info}</div>}
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setOrderModal(null);
                  navigate('/orders');
                }}
                className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition"
              >
                <Zap className="w-4 h-4" />
                <span>Go to OTP Reader</span>
              </button>
              <button
                onClick={() => setOrderModal(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

