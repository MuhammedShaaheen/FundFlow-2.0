import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ListOrdered, 
  PlusCircle, 
  Search, 
  Phone, 
  MapPin, 
  UserCog,
  ShieldCheck,
  Key,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2, 
  XCircle, 
  CircleDollarSign,
  Trophy,
  TrendingUp,
  Wallet,
  ArrowRight,
  Filter,
  Edit2,
  Trash2,
  ChevronRight,
  Loader2,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import type { Collection, Stats } from './types';

type View = 'dashboard' | 'list' | 'input';

const ADMIN_PASSWORD = 'Muneer786';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<string>('All');
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  
  // Password protection state
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<{ type: 'view' | 'action', action?: () => void } | null>(null);

  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    place: '',
    contact: '',
    amount: '',
    paid_amount: '',
    status: 'unpaid' as 'paid' | 'unpaid' | 'partial'
  });

  const calculateStats = (data: Collection[]): Stats => {
    const totalPaid = data.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0);
    const totalTarget = data.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalUnpaid = Math.max(0, totalTarget - totalPaid);
    
    const countTotal = data.length;
    const countCollected = data.filter(c => (Number(c.paid_amount) || 0) > 0).length;
    const countPending = data.filter(c => c.status !== 'paid').length;

    const placeMap = new Map<string, { total: number, paid: number, unpaid: number }>();
    data.forEach(c => {
      const placeName = c.place || 'Unknown';
      const current = placeMap.get(placeName) || { total: 0, paid: 0, unpaid: 0 };
      const amt = Number(c.amount) || 0;
      const paid = Number(c.paid_amount) || 0;
      
      current.total += amt;
      current.paid += paid;
      current.unpaid += Math.max(0, amt - paid);
      placeMap.set(placeName, current);
    });

    const placeStats = Array.from(placeMap.entries()).map(([place, stats]) => ({
      place,
      ...stats
    })).sort((a, b) => b.paid - a.paid);

    const leaderboard = [...data]
      .filter(c => (Number(c.paid_amount) || 0) > 0) // Only show people who have actually paid something
      .sort((a, b) => (Number(b.paid_amount) || 0) - (Number(a.paid_amount) || 0))
      .slice(0, 10)
      .map(c => ({
        name: c.name,
        place: c.place,
        amount: Number(c.amount) || 0,
        paid_amount: Number(c.paid_amount) || 0,
        status: c.status
      }));

    return {
      totalPaid,
      totalUnpaid,
      totalTarget,
      countTotal,
      countCollected,
      countPending,
      placeStats,
      leaderboard
    };
  };

  const fetchData = () => {
    setLoading(true);
    try {
      const savedData = localStorage.getItem('collections');
      const collectionsData: Collection[] = savedData ? JSON.parse(savedData) : [];
      setCollections(collectionsData);
      setStats(calculateStats(collectionsData));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    let paid_amount = parseFloat(formData.paid_amount) || 0;

    // Data Protection Logic
    if (formData.status === 'paid') {
      paid_amount = amount;
    } else if (formData.status === 'unpaid') {
      paid_amount = 0;
    } else if (formData.status === 'partial') {
      if (paid_amount >= amount) {
        alert(`⚠️ Partial payment cannot be equal to or greater than the total amount (₹${amount}). Please set status to "Paid" instead.`);
        return;
      }
      if (paid_amount <= 0) {
        alert('⚠️ Partial payment must be greater than 0. Please set status to "Unpaid" if no payment was made.');
        return;
      }
    }

    try {
      const savedData = localStorage.getItem('collections');
      let collectionsData: Collection[] = savedData ? JSON.parse(savedData) : [];

      if (editingCollection) {
        collectionsData = collectionsData.map(c => 
          c.id === editingCollection.id 
            ? { ...c, ...formData, amount, paid_amount } 
            : c
        );
      } else {
        const newCollection: Collection = {
          id: Date.now(),
          ...formData,
          amount,
          paid_amount,
          created_at: new Date().toISOString()
        };
        collectionsData.push(newCollection);
      }

      localStorage.setItem('collections', JSON.stringify(collectionsData));
      setFormData({ name: '', place: '', contact: '', amount: '', paid_amount: '', status: 'unpaid' });
      setEditingCollection(null);
      setView('list');
      fetchData();
    } catch (error) {
      console.error('Error saving collection:', error);
      alert('Failed to save data to local storage.');
    }
  };

  const handleEdit = (collection: Collection) => {
    if (!isAdmin) {
      setShowPasswordPrompt({ 
        type: 'action', 
        action: () => {
          setEditingCollection(collection);
          setFormData({
            name: collection.name,
            place: collection.place,
            contact: collection.contact,
            amount: collection.amount.toString(),
            paid_amount: collection.paid_amount.toString(),
            status: collection.status
          });
          setView('input');
        } 
      });
      return;
    }
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      place: collection.place,
      contact: collection.contact,
      amount: collection.amount.toString(),
      paid_amount: collection.paid_amount.toString(),
      status: collection.status
    });
    setView('input');
  };

  const handleDeleteRequest = (id: number) => {
    if (!isAdmin) {
      setShowPasswordPrompt({ type: 'action', action: () => setDeleteConfirm(id) });
      return;
    }
    setDeleteConfirm(id);
  };

  const handleDelete = (id: number | null) => {
    if (!id) return;
    setDeleting(true);
    try {
      const savedData = localStorage.getItem('collections');
      let collectionsData: Collection[] = savedData ? JSON.parse(savedData) : [];
      collectionsData = collectionsData.filter(c => c.id !== id);
      localStorage.setItem('collections', JSON.stringify(collectionsData));
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Failed to delete data from local storage.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredCollections.map((c, idx) => ({
      '#': idx + 1,
      'Name': c.name,
      'Place': c.place,
      'Contact': c.contact,
      'Target Amount': c.amount,
      'Paid Amount': c.paid_amount,
      'Status': c.status.toUpperCase(),
      'Date': new Date(c.created_at).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collections");
    XLSX.writeFile(wb, `Collections_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map data to match our schema
        // Expected columns: Name, Place, Contact, Amount, Status
        const mappedData = data.map((row: any) => {
          const statusRaw = (row.Status || row.status || 'unpaid').toString().toLowerCase();
          let status: 'paid' | 'unpaid' | 'partial' = 'unpaid';
          if (statusRaw === 'paid') status = 'paid';
          else if (statusRaw === 'partial') status = 'partial';
          
          // Handle void/empty amount cells by defaulting to 0
          const amount = row.Amount !== undefined && row.Amount !== null && row.Amount !== "" ? parseFloat(row.Amount) : 0;
          const paid_amount = row.PaidAmount !== undefined && row.PaidAmount !== null && row.PaidAmount !== "" ? parseFloat(row.PaidAmount) : 
                             (row['Paid Amount'] !== undefined && row['Paid Amount'] !== null && row['Paid Amount'] !== "" ? parseFloat(row['Paid Amount']) : 
                             (row.paid_amount !== undefined && row.paid_amount !== null && row.paid_amount !== "" ? parseFloat(row.paid_amount) : 0));

          return {
            name: (row.Name || row.name || 'Unknown').toString(),
            place: (row.Place || row.place || 'Unknown').toString(),
            contact: (row.Contact || row.contact || '').toString(),
            amount: isNaN(amount) ? 0 : amount,
            paid_amount: isNaN(paid_amount) ? 0 : paid_amount,
            status
          };
        }).filter(item => item.name); // Only filter if name is completely missing

        if (mappedData.length === 0) {
          alert('No valid data found in the Excel file. Please ensure columns are named: Name, Place, Contact, Amount, Status.');
          setImporting(false);
          return;
        }

        const savedData = localStorage.getItem('collections');
        let collectionsData: Collection[] = savedData ? JSON.parse(savedData) : [];
        
        const newRecords = mappedData.map((item, index) => ({
          id: Date.now() + index,
          ...item,
          created_at: new Date().toISOString()
        }));

        collectionsData = [...collectionsData, ...newRecords];
        localStorage.setItem('collections', JSON.stringify(collectionsData));

        alert(`Successfully imported ${mappedData.length} records!`);
        setShowImportModal(false);
        fetchData();
      } catch (error) {
        console.error('Error importing Excel:', error);
        alert('Failed to parse Excel file. Please check the format.');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const places = ['All', ...Array.from(new Set(collections.map(c => c.place)))];
  const filteredCollections = selectedPlace === 'All' 
    ? collections 
    : collections.filter(c => c.place === selectedPlace);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      const pendingAction = showPasswordPrompt?.action;
      setShowPasswordPrompt(null);
      setPasswordInput('');
      setPasswordError(false);
      if (pendingAction) pendingAction();
    } else {
      setPasswordError(true);
      setPasswordInput('');
      // Auto-clear error after 3 seconds
      setTimeout(() => setPasswordError(false), 3000);
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: View, icon: any, label: string }) => (
    <button
      onClick={() => {
        if (id === 'input' && !isAdmin) {
          setShowPasswordPrompt({ type: 'view', action: () => setView('input') });
          return;
        }
        setView(id);
        if (id !== 'input') setEditingCollection(null);
      }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        view === id 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={18} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 md:pb-0">
      {/* Top Header - Mobile & Desktop */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Wallet className="text-white" size={20} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">FundFlow</h1>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex gap-2">
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem id="list" icon={ListOrdered} label="Collections" />
            {isAdmin && <NavItem id="input" icon={PlusCircle} label={editingCollection ? "Edit" : "Add New"} />}
            
            <div className="w-px h-6 bg-slate-200 mx-2 self-center" />
            
            {isAdmin ? (
              <button
                onClick={() => { setIsAdmin(false); setView('dashboard'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-rose-600 hover:bg-rose-50 font-medium"
              >
                <UserCog size={18} />
                <span>Logout</span>
              </button>
            ) : (
              <button
                onClick={() => setShowPasswordPrompt({ type: 'view' })}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-indigo-600 hover:bg-indigo-50 font-medium"
              >
                <ShieldCheck size={18} />
                <span>Admin Login</span>
              </button>
            )}
          </div>

          {/* Mobile Admin Toggle */}
          <div className="md:hidden flex items-center gap-2">
            {isAdmin ? (
              <button onClick={() => { setIsAdmin(false); setView('dashboard'); }} className="p-2 text-rose-600">
                <UserCog size={20} />
              </button>
            ) : (
              <button onClick={() => setShowPasswordPrompt({ type: 'view' })} className="p-2 text-indigo-600">
                <ShieldCheck size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        <button 
          onClick={() => setView('list')}
          className={`flex flex-col items-center gap-1 ${view === 'list' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <ListOrdered size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">List</span>
        </button>
        {isAdmin && (
          <button 
            onClick={() => { setView('input'); setEditingCollection(null); }}
            className={`flex flex-col items-center gap-1 ${view === 'input' ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <PlusCircle size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
          </button>
        )}
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <AnimatePresence>
          {/* Password Prompt Modal */}
          {showPasswordPrompt && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
              >
                <div className="bg-indigo-100 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                  <Key size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-800">Admin Access</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  Please enter the password to access restricted features.
                </p>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="relative">
                    <input 
                      autoFocus
                      type="password"
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (passwordError) setPasswordError(false);
                      }}
                      placeholder="Enter password"
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                        passwordError 
                          ? 'border-rose-500 focus:ring-rose-500 bg-rose-50' 
                          : 'border-slate-200 focus:ring-indigo-500'
                      }`}
                    />
                    <AnimatePresence>
                      {passwordError && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-rose-600 text-xs font-bold mt-2 ml-1 flex items-center gap-1"
                        >
                          <AlertCircle size={12} />
                          Incorrect password. Please try again.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowPasswordPrompt(null)}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                      Verify
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              >
                <div className="bg-rose-100 w-12 h-12 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-800">Delete Entry?</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  Are you sure you want to delete this collection record? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={deleting}
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showImportModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
                    <FileSpreadsheet size={24} />
                  </div>
                  <button 
                    onClick={() => setShowImportModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <XCircle size={24} className="text-slate-400" />
                  </button>
                </div>
                
                <h3 className="text-xl font-bold mb-2">Import from Excel</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Upload an Excel file (.xlsx or .xls) with the following columns: 
                  <span className="font-bold text-slate-700"> Name, Place, Contact, Amount, Status, Paid Amount</span>.
                </p>

                <div className="space-y-4">
                  <label className="block w-full cursor-pointer">
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group">
                      {importing ? (
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                      ) : (
                        <Upload className="text-slate-400 group-hover:text-indigo-500 mb-2" size={32} />
                      )}
                      <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600">
                        {importing ? 'Importing...' : 'Click to upload file'}
                      </span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".xlsx, .xls" 
                        onChange={handleFileUpload}
                        disabled={importing}
                      />
                    </div>
                  </label>

                  <div className="bg-amber-50 p-4 rounded-xl flex gap-3">
                    <AlertCircle className="text-amber-600 shrink-0" size={20} />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Make sure the column headers match exactly. "Status" should be either "Paid" or "Unpaid".
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
              <p className="text-slate-500 font-medium">Loading data...</p>
            </motion.div>
          ) : view === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <TrendingUp size={24} />
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">TOTAL</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-slate-500 text-sm font-medium">Overall Target</h3>
                      <p className="text-3xl font-bold mt-1">₹{stats?.totalTarget.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-center text-slate-400 bg-slate-50 p-2 rounded-xl min-w-[60px]">
                      <Users size={18} className="mb-1" />
                      <span className="text-xs font-bold text-slate-600">{stats?.countTotal}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle2 size={24} />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">PAID</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-slate-500 text-sm font-medium">Total Collected</h3>
                      <p className="text-3xl font-bold mt-1">₹{stats?.totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-center text-slate-400 bg-slate-50 p-2 rounded-xl min-w-[60px]">
                      <Users size={18} className="mb-1" />
                      <span className="text-xs font-bold text-slate-600">{stats?.countCollected}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                      <XCircle size={24} />
                    </div>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">UNPAID</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-slate-500 text-sm font-medium">Pending Amount</h3>
                      <p className="text-3xl font-bold mt-1">₹{stats?.totalUnpaid.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-center text-slate-400 bg-slate-50 p-2 rounded-xl min-w-[60px]">
                      <Users size={18} className="mb-1" />
                      <span className="text-xs font-bold text-slate-600">{stats?.countPending}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Place-wise Stats */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <MapPin size={20} className="text-indigo-600" />
                      Collection by Place
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {stats?.placeStats.map((place) => (
                      <div key={place.place} className="group">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-slate-700">{place.place}</span>
                          <span className="text-slate-500">₹{place.paid.toLocaleString()} / ₹{place.total.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${place.total > 0 ? (place.paid / place.total) * 100 : 0}%` }}
                            className="h-full bg-indigo-500 rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                    {stats?.placeStats.length === 0 && (
                      <p className="text-center py-10 text-slate-400 italic">No data available yet</p>
                    )}
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Trophy size={20} className="text-amber-500" />
                      Top Payers
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {stats?.leaderboard.map((payer, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            idx === 0 ? 'bg-amber-100 text-amber-700' : 
                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-800">{payer.name}</p>
                              <span className={`w-1.5 h-1.5 rounded-full ${payer.status === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin size={10} /> {payer.place}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-indigo-600">₹{payer.paid_amount.toLocaleString()}</p>
                      </div>
                    ))}
                    {stats?.leaderboard.length === 0 && (
                      <p className="text-center py-10 text-slate-400 italic">No payers found</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : view === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-slate-800">Collections List</h2>
                  {isAdmin && (
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-bold text-xs shadow-sm shadow-emerald-200"
                    >
                      <FileSpreadsheet size={14} />
                      Export Excel
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                      value={selectedPlace}
                      onChange={(e) => setSelectedPlace(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                    >
                      {places.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payer Details</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Place</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCollections.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 text-sm text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{c.name}</span>
                              <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <Phone size={12} /> {c.contact || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
                              <MapPin size={14} className="text-slate-400" />
                              {c.place}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900">₹{c.amount.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              c.status === 'paid' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : c.status === 'partial'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {c.status === 'paid' ? <CheckCircle2 size={12} /> : c.status === 'partial' ? <CircleDollarSign size={12} /> : <XCircle size={12} />}
                              {c.status.toUpperCase()}
                            </span>
                            {c.status === 'partial' && (
                              <div className="text-[10px] text-slate-400 mt-1 font-medium">
                                Paid: ₹{c.paid_amount.toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleEdit(c)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRequest(c.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300 italic">View Only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredCollections.map((c, idx) => (
                    <div key={c.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <span className="text-xs font-bold text-slate-300 mt-1">#{idx + 1}</span>
                          <div>
                            <p className="font-bold text-slate-800">{c.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone size={10} /> {c.contact || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'paid' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : c.status === 'partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Place</span>
                          <span className="text-xs font-medium text-slate-600">{c.place}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Amount</span>
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-900">₹{c.amount.toLocaleString()}</span>
                            {c.status === 'partial' && (
                              <span className="text-[10px] text-amber-600 font-bold">Paid: ₹{c.paid_amount.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex justify-end gap-2 pt-1">
                          <button 
                            onClick={() => handleEdit(c)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteRequest(c.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredCollections.length === 0 && (
                  <div className="px-6 py-20 text-center text-slate-400 italic">
                    No collections found for this place
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-3 rounded-2xl">
                      {editingCollection ? <Edit2 className="text-white" size={24} /> : <PlusCircle className="text-white" size={24} />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">
                        {editingCollection ? 'Edit Collection' : 'New Collection'}
                      </h2>
                      <p className="text-slate-500 text-sm">Enter the details of the fund collection</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold text-sm"
                    >
                      <Upload size={18} />
                      <span className="hidden sm:inline">Import Excel</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Payer Name</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Place</label>
                      <input
                        required
                        type="text"
                        list="place-suggestions"
                        placeholder="e.g. Downtown"
                        value={formData.place}
                        onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                      <datalist id="place-suggestions">
                        {stats?.placeStats.map(p => (
                          <option key={p.place} value={p.place} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Contact Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. +1 234 567 890"
                        value={formData.contact}
                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Amount (₹)</label>
                      <input
                        required
                        type="number"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Payment Status</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'paid' })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-sm ${
                          formData.status === 'paid'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <CheckCircle2 size={16} />
                        Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'partial' })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-sm ${
                          formData.status === 'partial'
                            ? 'bg-amber-50 border-amber-500 text-amber-700'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <CircleDollarSign size={16} />
                        Partial
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'unpaid' })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-sm ${
                          formData.status === 'unpaid'
                            ? 'bg-rose-50 border-rose-500 text-rose-700'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <XCircle size={16} />
                        Unpaid
                      </button>
                    </div>
                  </div>

                  {formData.status === 'partial' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <label className="text-sm font-bold text-slate-700 ml-1">Paid Amount (₹)</label>
                      <input
                        required
                        type="number"
                        placeholder="Enter amount already paid"
                        value={formData.paid_amount}
                        onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </motion.div>
                  )}

                  <div className="pt-4 flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      {editingCollection ? 'Update' : 'Save Collection'}
                      <ArrowRight size={18} />
                    </button>
                    {editingCollection && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCollection(null);
                          setFormData({ name: '', place: '', contact: '', amount: '', status: 'unpaid' });
                          setView('list');
                        }}
                        className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-8 border-t border-slate-200 mt-8">
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="text-slate-400 text-sm font-medium">
            Powered by{' '}
            <a 
              href="https://www.quardlink.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
            >
              Quardlink
            </a>
          </p>
          <p className="text-slate-300 text-[10px] uppercase tracking-widest font-bold">
            © {new Date().getFullYear()} FundFlow Manager
          </p>
        </div>
      </footer>
    </div>
  );
}
