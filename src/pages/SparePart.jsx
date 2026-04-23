import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Check, Loader2, Package, Calendar, ArrowUpRight, ArrowDownLeft, History, Database, ChevronDown, Search } from 'lucide-react';

const categories = ['ANFO Truck', 'Compressor', 'Forklift', 'Genset', 'HWB', 'MMU', 'OSP'];

export const SparePart = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom Dropdown State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    sparepart_id: '', 
    nama_sparepart: '',
    part_number: '',
    kategori: 'MMU',
    jumlah: '',
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inventory') {
        const { data, error } = await supabase.from('spareparts').select('*').order('nama_sparepart', { ascending: true });
        if (error) throw error;
        setInventory(data || []);
      } else {
        const { data, error } = await supabase.from('sparepart_history').select('*, spareparts(nama_sparepart, part_number, kategori)').order('created_at', { ascending: false });
        if (error) throw error;
        setHistory(data || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    try {
      let spId = formData.sparepart_id;

      if (!spId) {
        const { data: newSp, error: spError } = await supabase.from('spareparts').insert({
          nama_sparepart: formData.nama_sparepart,
          part_number: formData.part_number || null,
          kategori: formData.kategori,
          stok: 0
        }).select().single();
        if (spError) throw spError;
        spId = newSp.id;
      }

      const { error: histError } = await supabase.from('sparepart_history').insert({
        sparepart_id: spId,
        user_id: user.id,
        nama_user: profile?.nama || 'Unknown',
        tipe: 'IN',
        jumlah: parseInt(formData.jumlah, 10),
        tanggal: formData.tanggal,
        keterangan: formData.keterangan
      });

      if (histError) throw histError;
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) { setError(err.message); } finally { setSubmitLoading(false); }
  };

  const resetForm = () => {
    setFormData({ sparepart_id: '', nama_sparepart: '', part_number: '', kategori: 'MMU', jumlah: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '' });
  };

  const filteredInventory = inventory.filter(i => 
    i.kategori === formData.kategori && 
    i.nama_sparepart.toLowerCase().includes(formData.nama_sparepart.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-primary" /> Spare Part
          </h1>
          <p className="text-foreground/60">Manajemen stok dan riwayat barang</p>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-medium shadow-lg shadow-primary/20">
          <Plus size={20} /> Input Barang Masuk
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-foreground/60 hover:text-foreground'}`}><Database size={18} /> Stok Saat Ini</button>
        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-foreground/60 hover:text-foreground'}`}><History size={18} /> Riwayat In / Out</button>
      </div>

      {/* Table Content */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {activeTab === 'inventory' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background/50 text-foreground/70 text-sm border-b border-border">
                  <th className="px-6 py-4 font-medium">Sparepart</th>
                  <th className="px-6 py-4 font-medium">Kategori</th>
                  <th className="px-6 py-4 font-medium text-right">Stok</th>
                  <th className="px-6 py-4 font-medium">Terakhir Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                ) : inventory.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-foreground/50">Data kosong.</td></tr>
                ) : (
                  inventory.map(item => (
                    <tr key={item.id} className="hover:bg-foreground/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium">{item.nama_sparepart}</p>
                        {item.part_number && <p className="text-xs text-foreground/60 font-mono">P/N: {item.part_number}</p>}
                      </td>
                      <td className="px-6 py-4"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">{item.kategori}</span></td>
                      <td className="px-6 py-4 text-right font-bold text-lg">{item.stok} {item.satuan}</td>
                      <td className="px-6 py-4 text-sm text-foreground/60">{new Date(item.updated_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background/50 text-foreground/70 text-sm border-b border-border">
                  <th className="px-6 py-4 font-medium">Tanggal</th>
                  <th className="px-6 py-4 font-medium">Sparepart</th>
                  <th className="px-6 py-4 font-medium">Kategori</th>
                  <th className="px-6 py-4 font-medium">Tipe</th>
                  <th className="px-6 py-4 font-medium text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-foreground/50">Belum ada riwayat.</td></tr>
                ) : (
                  history.map(item => (
                    <tr key={item.id} className="hover:bg-foreground/5 transition-colors">
                      <td className="px-6 py-4 text-sm whitespace-nowrap"><div className="flex items-center gap-2"><Calendar size={14} className="text-foreground/50" /> {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div></td>
                      <td className="px-6 py-4 font-medium text-sm">{item.spareparts?.nama_sparepart}</td>
                      <td className="px-6 py-4"><span className="text-[10px] px-2 py-0.5 bg-foreground/5 rounded-md border border-border">{item.spareparts?.kategori}</span></td>
                      <td className="px-6 py-4">
                        {item.tipe === 'IN' ? <span className="text-green-500 text-xs font-bold flex items-center gap-1"><ArrowUpRight size={14}/> MASUK</span> : <span className="text-orange-500 text-xs font-bold flex items-center gap-1"><ArrowDownLeft size={14}/> KELUAR</span>}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${item.tipe === 'IN' ? 'text-green-500' : 'text-orange-500'}`}>{item.tipe === 'IN' ? '+' : '-'}{item.jumlah}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Input Barang Masuk */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-border bg-card">
              <h2 className="text-xl font-bold">Input Barang Masuk</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-foreground/5 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-sm border border-red-500/20">{error}</div>}

              {/* 1. Kategori di Paling Atas */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Pilih Kategori Unit</label>
                <select 
                  value={formData.kategori} 
                  onChange={e => {
                    setFormData({...formData, kategori: e.target.value, sparepart_id: '', nama_sparepart: '', part_number: ''});
                    setShowSuggestions(false);
                  }} 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* 2. Custom Searchable Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium mb-1.5">Nama Sparepart</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder={`Pilih atau ketik sparepart ${formData.kategori}...`}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-10"
                    value={formData.nama_sparepart}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selected = inventory.find(i => i.nama_sparepart === val && i.kategori === formData.kategori);
                      setFormData({ 
                        ...formData, 
                        sparepart_id: selected ? selected.id : '', 
                        nama_sparepart: val, 
                        part_number: selected ? (selected.part_number || '') : formData.part_number 
                      });
                      setShowSuggestions(true);
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <ChevronDown size={18} />
                  </div>
                </div>

                {/* Dropdown List */}
                {showSuggestions && (
                  <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    {filteredInventory.length > 0 ? (
                      filteredInventory.map(i => (
                        <button
                          key={i.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors flex justify-between items-center border-b border-border/50 last:border-0"
                          onClick={() => {
                            setFormData({ ...formData, sparepart_id: i.id, nama_sparepart: i.nama_sparepart, part_number: i.part_number || '' });
                            setShowSuggestions(false);
                          }}
                        >
                          <div>
                            <p className="font-medium text-sm text-foreground">{i.nama_sparepart}</p>
                            {i.part_number && <p className="text-[10px] text-foreground/50 font-mono">P/N: {i.part_number}</p>}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] bg-foreground/5 px-2 py-0.5 rounded text-foreground/60 border border-border">Stok: {i.stok}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-sm text-foreground/50 flex flex-col items-center gap-2">
                        <Search size={20} className="opacity-20" />
                        <span>"{formData.nama_sparepart}" tidak ditemukan. Klik luar untuk mendaftarkan sebagai item baru.</span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-foreground/40 mt-1">
                  Menampilkan sparepart kategori <span className="text-primary font-bold">{formData.kategori}</span>.
                </p>
              </div>

              {/* 3. Kolom P/N muncul jika Nama baru */}
              {!formData.sparepart_id && formData.nama_sparepart && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Daftarkan item baru di {formData.kategori}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Part Number (Opsional)</label>
                    <input 
                      type="text" 
                      value={formData.part_number} 
                      onChange={e => setFormData({...formData, part_number: e.target.value})} 
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 font-mono" 
                      placeholder="Masukkan P/N jika ada" 
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Jumlah Masuk</label>
                  <input type="number" min="1" required value={formData.jumlah} onChange={e => setFormData({...formData, jumlah: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tanggal</label>
                  <input type="date" required value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Keterangan</label>
                <textarea value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50" placeholder="Opsional..." rows="2" />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl hover:bg-foreground/5 font-medium transition-colors">Batal</button>
                <button type="submit" disabled={submitLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95">
                  {submitLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Simpan Stok Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
