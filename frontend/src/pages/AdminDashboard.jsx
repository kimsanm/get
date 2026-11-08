import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  LayoutDashboard, 
  Upload, 
  Package, 
  DollarSign, 
  Users, 
  PlusCircle, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Bulk Upload Form
  const [uploadProductId, setUploadProductId] = useState('');
  const [uploadRawData, setUploadRawData] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  // Top Up Form
  const [topupUser, setTopupUser] = useState('');
  const [topupAmount, setTopupAmount] = useState('');

  // New Product Form
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'outlook',
    price: '',
    description: '',
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    imap_tls: 1
  });

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data.stats);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.products);
      if (res.data.products.length > 0 && !uploadProductId) {
        setUploadProductId(res.data.products[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/stock');
      setStockList(res.data.stock);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchStock();
    }
  }, [activeTab]);

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!uploadProductId || !uploadRawData.trim()) {
      setMessage({ text: 'Please choose a product and paste accounts data.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ text: '', type: '' });
      const res = await api.post('/admin/upload-stock', {
        productId: uploadProductId,
        rawData: uploadRawData
      });

      setUploadResult(res.data);
      setMessage({ text: res.data.message, type: 'success' });
      setUploadRawData('');
      fetchStats();
      fetchProducts();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to upload stock.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    try {
      setMessage({ text: '', type: '' });
      const res = await api.post('/admin/topup', {
        username: topupUser,
        amount: Number(topupAmount)
      });
      setMessage({ text: res.data.message, type: 'success' });
      setTopupUser('');
      setTopupAmount('');
      fetchStats();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Topup failed.', type: 'error' });
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      setMessage({ text: '', type: '' });
      const res = await api.post('/admin/products', newProduct);
      setMessage({ text: res.data.message, type: 'success' });
      setNewProduct({
        name: '',
        category: 'outlook',
        price: '',
        description: '',
        imap_host: 'outlook.office365.com',
        imap_port: 993,
        imap_tls: 1
      });
      fetchProducts();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to save product.', type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-3">
            <LayoutDashboard className="w-8 h-8 text-amber-400" />
            <span>Store Admin Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage stock inventory, bulk upload mail accounts, add balance, and configure products.
          </p>
        </div>
        <button
          onClick={() => {
            fetchStats();
            fetchProducts();
            if (activeTab === 'stock') fetchStock();
          }}
          className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Global alert */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-xl flex items-center space-x-3 text-sm ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/10 border border-red-500/30 text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            ${stats?.totalRevenue?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Orders</span>
            <Package className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats?.totalOrders || 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Available Stock</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            {stats?.availableStock || 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Registered Users</span>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats?.totalUsers || 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-4 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'stats'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Bulk Upload Stock</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'stock'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>Stock Inventory ({stats?.availableStock || 0})</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'products'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-4 h-4" />
            <span>Add / Edit Product</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('topup')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'topup'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4" />
            <span>Top Up User Balance</span>
          </div>
        </button>
      </div>

      {/* Tab 1: Bulk Upload */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
              <Upload className="w-5 h-5 text-sky-400" />
              <span>Import Email Stock</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Paste accounts in standard seller format: <code>email|password|recovery|extra</code> or tab/colon separated.
            </p>

            <form onSubmit={handleBulkUpload} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                  Select Product Category
                </label>
                <select
                  value={uploadProductId}
                  onChange={(e) => setUploadProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                  Accounts Data (One per line)
                </label>
                <textarea
                  rows={10}
                  value={uploadRawData}
                  onChange={(e) => setUploadRawData(e.target.value)}
                  placeholder={`testaccount1@outlook.com|Password123|recovery@mail.com\ntestaccount2@outlook.com|Password456|recovery2@mail.com`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-600/20 transition disabled:opacity-50"
              >
                {loading ? 'Processing Import...' : 'Import Accounts to Inventory'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h4 className="text-sm font-bold text-white mb-3">Format Guide</h4>
              <div className="text-xs text-slate-400 space-y-3">
                <p>You can paste thousands of lines at once. Supported delimiters:</p>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
                  user@outlook.com|Pass123<br />
                  user@outlook.com|Pass123|rec@mail.com<br />
                  user@gmail.com|Pass123|rec@mail.com|app_pass
                </div>
                <p>The parser automatically handles pipes (<code>|</code>), colons (<code>:</code>), and tabs (<code>\t</code>).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Inventory Table */}
      {activeTab === 'stock' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Stock List (Latest 100)</h3>
            <button
              onClick={fetchStock}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Password</th>
                  <th className="py-3 px-4">Recovery</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stockList.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500">#{item.id}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{item.product_name}</td>
                    <td className="py-3 px-4 text-white font-medium">{item.email}</td>
                    <td className="py-3 px-4 text-slate-400">{item.password}</td>
                    <td className="py-3 px-4 text-slate-500">{item.recovery_email || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                        item.status === 'available'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Products */}
      {activeTab === 'products' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto">
          <h3 className="text-lg font-bold text-white mb-4">Create New Mail Product</h3>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Product Title</label>
              <input
                type="text"
                required
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="e.g. Outlook Aged 2024 (IMAP Enabled)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Price ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="0.30"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="outlook">Outlook / Hotmail</option>
                  <option value="gmail">Gmail</option>
                  <option value="rambler">Rambler</option>
                  <option value="custom">Custom Domain</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">IMAP Server Host</label>
              <input
                type="text"
                value={newProduct.imap_host}
                onChange={(e) => setNewProduct({ ...newProduct, imap_host: e.target.value })}
                placeholder="outlook.office365.com or imap.gmail.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
              <textarea
                rows={3}
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="Product description and details..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-600/20 transition"
            >
              Save Product
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Top Up User */}
      {activeTab === 'topup' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-md mx-auto">
          <h3 className="text-lg font-bold text-white mb-2">Deposit Funds to Customer</h3>
          <p className="text-xs text-slate-400 mb-6">Manually credit a user account after receiving payment.</p>

          <form onSubmit={handleTopup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
              <input
                type="text"
                required
                value={topupUser}
                onChange={(e) => setTopupUser(e.target.value)}
                placeholder="e.g. demo_user"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Amount ($ USD)</label>
              <input
                type="number"
                step="0.1"
                required
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="20.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition"
            >
              Add Balance
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

