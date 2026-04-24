import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Check, Loader2, Droplets, Calendar, ArrowUpRight, ArrowDownLeft, History, Database, ChevronDown, Search, Upload, Download, FileText, AlertCircle, Tag } from 'lucide-react';
import * as XLSX from 'xlsx';

const categories = ['Lube', 'General Consumable'];
const units = ['Liter', 'Pail', 'Kg', 'Can', 'Pcs', 'Bottle', 'Drum'];

export const OilGeneral = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkStatus, setBulkStatus] = useState({ total: 0, current: 0, errors: [] });
  
  // Custom Dropdown State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    item_id: '', 
    nama_barang: '',
    merk: '',
    kategori: 'Lube',
    jumlah: '',
    satuan: 'Liter',
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
        const { data, error } = await supabase.from('oil_consumables').select('*').order('nama_barang', { ascending: true });
        if (error) throw error;
        setInventory(data || []);
      } else {
        const { data, error } = await supabase.from('oil_consumable_history').select('*, oil_consumables(nama_barang, merk, kategori, satuan)').order('created_at', { ascending: false });
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
      let itemId = formData.item_id;

      if (!itemId) {
        const { data: newItem, error: itemError } = await supabase.from('oil_consumables').insert({
          nama_barang: formData.nama_barang,
          merk: formData.merk || null,
          kategori: formData.kategori,
          satuan: formData.satuan,
          stok: 0
        }).select().single();
        if (itemError) throw itemError;
        itemId = newItem.id;
      }

      const { error: histError } = await supabase.from('oil_consumable_history').insert({
        oil_consumable_id: itemId,
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

  const handleExportCSV = () => {
    const dataToExport = activeTab === 'inventory' 
      ? inventory.map(i => ({ 
          'Nama Barang': i.nama_barang, 
          'Merk': i.merk || '-',
          'Kategori': i.kategori, 
          'Stok': i.stok,
          'Satuan': i.satuan,
          'Terakhir Update': new Date(i.updated_at).toLocaleString('id-ID')
        }))
      : history.map(h => ({
          'Tanggal': h.tanggal,
          'Barang': h.oil_consumables?.nama_barang,
          'Merk': h.oil_consumables?.merk || '-',
          'Kategori': h.oil_consumables?.kategori,
          'Tipe': h.tipe,
          'Jumlah': h.jumlah,
          'User': h.nama_user,
          'Keterangan': h.keterangan || '-'
        }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Export_OilConsumable_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const data = [
      {
        'Kategori': 'Lube',
        'Nama Barang': 'Oli Mesin SAE 15W-40',
        'Merk': 'Meditran',
        'Jumlah': 20,
        'Satuan': 'Liter',
        'Tanggal': new Date().toISOString().split('T')[0],
        'Keterangan': 'Stok Awal'
      },
      {
        'Kategori': 'General Consumable',
        'Nama Barang': 'Majun Putih',
        'Merk': '-',
        'Jumlah': 5,
        'Satuan': 'Kg',
        'Tanggal': new Date().toISOString().split('T')[0],
        'Keterangan': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Bulk_Oil_Consumable.xlsx");
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubmitLoading(true);
    setError('');
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          throw new Error('File kosong atau format tidak sesuai.');
        }

        setBulkStatus({ total: data.length, current: 0, errors: [] });
        
        let successCount = 0;
        let errorList = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            if (!row['Kategori'] || !row['Nama Barang'] || !row['Jumlah']) {
              throw new Error(`Baris ${i + 1}: Kategori, Nama, dan Jumlah wajib diisi.`);
            }

            if (!categories.includes(row['Kategori'])) {
              throw new Error(`Baris ${i + 1}: Kategori "${row['Kategori']}" tidak valid.`);
            }

            let itemId;
            const { data: existing, error: findError } = await supabase
              .from('oil_consumables')
              .select('id')
              .eq('nama_barang', row['Nama Barang'])
              .eq('kategori', row['Kategori'])
              .maybeSingle();

            if (findError) throw findError;

            if (existing) {
              itemId = existing.id;
            } else {
              const { data: newItem, error: itemError } = await supabase.from('oil_consumables').insert({
                nama_barang: row['Nama Barang'],
                merk: row['Merk'] || null,
                kategori: row['Kategori'],
                satuan: row['Satuan'] || 'Liter',
                stok: 0
              }).select().single();
              if (itemError) throw itemError;
              itemId = newItem.id;
            }

            const { error: histError } = await supabase.from('oil_consumable_history').insert({
              oil_consumable_id: itemId,
              user_id: user.id,
              nama_user: profile?.nama || 'Unknown',
              tipe: 'IN',
              jumlah: parseInt(row['Jumlah'], 10),
              tanggal: row['Tanggal'] || new Date().toISOString().split('T')[0],
              keterangan: row['Keterangan'] || 'Bulk Upload'
            });

            if (histError) throw histError;
            successCount++;
          } catch (err) {
            errorList.push(err.message);
          }
          setBulkStatus(prev => ({ ...prev, current: i + 1, errors: errorList }));
        }

        if (errorList.length > 0) {
          setError(`${successCount} berhasil, ${errorList.length} gagal.`);
        } else {
          setIsBulkModalOpen(false);
          fetchData();
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  const resetForm = () => {
    setFormData({ item_id: '', nama_barang: '', merk: '', kategori: 'Lube', jumlah: '', satuan: 'Liter', tanggal: new Date().toISOString().split('T')[0], keterangan: '' });
  };

  const filteredInventory = inventory.filter(i => 
    i.kategori === formData.kategori && 
    i.nama_barang.toLowerCase().includes(formData.nama_barang.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Droplets className="text-primary" /> Oil & Consumable
          </h1>
          <p className="text-foreground/60">Manajemen stok oli dan barang habis pakai</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportCSV} className="bg-background border border-border text-foreground hover:bg-foreground/5 px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-medium">
            <Download size={20} /> Export CSV
          </button>
          <button onClick={() => { setIsBulkModalOpen(true); setError(''); setBulkStatus({ total: 0, current: 0, errors: [] }); }} className="bg-background border border-primary text-primary hover:bg-primary/5 px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-medium">
            <Upload size={20} /> Bulk Upload
          </button>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-medium shadow-lg shadow-primary/20">
            <Plus size={20} /> Input Barang Masuk
          </button>
        </div>
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
                  <th className="px-6 py-4 font-medium">Barang</th>
                  <th className="px-6 py-4 font-medium">Merk</th>
                  <th className="px-6 py-4 font-medium">Kategori</th>
                  <th className="px-6 py-4 font-medium text-right">Stok</th>
                  <th className="px-6 py-4 font-medium">Terakhir Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                ) : inventory.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-foreground/50">Data kosong.</td></tr>
                ) : (
                  inventory.map(item => (
                    <tr key={item.id} className="hover:bg-foreground/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium">{item.nama_barang}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-foreground/40" />
                          <span className="text-sm">{item.merk || '-'}</span>
                        </div>
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
                  <th className="px-6 py-4 font-medium">Barang</th>
                  <th className="px-6 py-4 font-medium text-right">Jumlah</th>
                  <th className="px-6 py-4 font-medium">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-foreground/50">Belum ada riwayat.</td></tr>
                ) : (
                  history.map(item => (
                    <tr key={item.id} className="hover:bg-foreground/5 transition-colors">
                      <td className="px-6 py-4 text-sm whitespace-nowrap"><div className="flex items-center gap-2"><Calendar size={14} className="text-foreground/50" /> {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div></td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm">{item.oil_consumables?.nama_barang}</p>
                        <p className="text-[10px] text-foreground/50 uppercase tracking-tighter">{item.oil_consumables?.kategori} • {item.oil_consumables?.merk || '-'}</p>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${item.tipe === 'IN' ? 'text-green-500' : 'text-orange-500'}`}>
                        {item.tipe === 'IN' ? <ArrowUpRight size={14} className="inline mr-1"/> : <ArrowDownLeft size={14} className="inline mr-1"/>}
                        {item.tipe === 'IN' ? '+' : '-'}{item.jumlah} {item.oil_consumables?.satuan}
                      </td>
                      <td className="px-6 py-4 text-xs text-foreground/60">{item.nama_user}</td>
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border bg-card">
              <h2 className="text-xl font-bold">Input Barang Masuk</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-foreground/5 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-sm border border-red-500/20">{error}</div>}

              <div>
                <label className="block text-sm font-medium mb-1.5">Pilih Kategori</label>
                <select 
                  value={formData.kategori} 
                  onChange={e => {
                    setFormData({...formData, kategori: e.target.value, item_id: '', nama_barang: '', merk: ''});
                    setShowSuggestions(false);
                  }} 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium mb-1.5">Nama Barang</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder={`Pilih atau ketik ${formData.kategori}...`}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-10"
                    value={formData.nama_barang}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selected = inventory.find(i => i.nama_barang === val && i.kategori === formData.kategori);
                      setFormData({ 
                        ...formData, 
                        item_id: selected ? selected.id : '', 
                        nama_barang: val, 
                        merk: selected ? (selected.merk || '') : formData.merk 
                      });
                      setShowSuggestions(true);
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <ChevronDown size={18} />
                  </div>
                </div>

                {showSuggestions && (
                  <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {filteredInventory.length > 0 ? (
                      filteredInventory.map(i => (
                        <button
                          key={i.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors flex justify-between items-center border-b border-border/50 last:border-0"
                          onClick={() => {
                            setFormData({ ...formData, item_id: i.id, nama_barang: i.nama_barang, merk: i.merk || '' });
                            setShowSuggestions(false);
                          }}
                        >
                          <div>
                            <p className="font-medium text-sm">{i.nama_barang}</p>
                            <p className="text-[10px] text-foreground/50">{i.merk || '-'}</p>
                          </div>
                          <span className="text-[10px] bg-foreground/5 px-2 py-0.5 rounded text-foreground/60">Stok: {i.stok}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-sm text-foreground/50 text-center">"{formData.nama_barang}" tidak ditemukan.</div>
                    )}
                  </div>
                )}
              </div>

              {!formData.item_id && formData.nama_barang && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Daftarkan item baru</p>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Merk (Opsional)</label>
                    <input type="text" value={formData.merk} onChange={e => setFormData({...formData, merk: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Contoh: Shell, Pertamina" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Jumlah</label>
                  <input type="number" min="1" required value={formData.jumlah} onChange={e => setFormData({...formData, jumlah: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Satuan</label>
                  <select 
                    value={formData.satuan} 
                    onChange={e => setFormData({...formData, satuan: e.target.value})} 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
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
                  {submitLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bulk Upload */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border bg-card">
              <h2 className="text-xl font-bold">Bulk Upload Oil & Consumable</h2>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-foreground/5 rounded-full"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-sm border border-red-500/20 flex gap-3">
                  <AlertCircle size={20} className="shrink-0" />
                  <div>
                    <p className="font-bold">Terjadi Kesalahan</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Gunakan Template</h3>
                    <p className="text-xs text-foreground/60">Unduh template Excel untuk Oil & Consumables.</p>
                  </div>
                </div>
                <button 
                  onClick={handleDownloadTemplate}
                  className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm"
                >
                  <Download size={18} /> Unduh Template (.xlsx)
                </button>
              </div>

              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:bg-foreground/5 transition-colors relative overflow-hidden">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-foreground/40" />
                    <p className="mb-2 text-sm text-foreground/60"><span className="font-bold text-primary">Klik untuk upload</span></p>
                    <p className="text-xs text-foreground/40">XLSX, XLS (Maks. 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleBulkUpload} disabled={submitLoading} />
                  
                  {submitLoading && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <p className="text-xs text-foreground/60">{bulkStatus.current} dari {bulkStatus.total}</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-border bg-card">
              <button onClick={() => setIsBulkModalOpen(false)} className="px-5 py-2.5 rounded-xl hover:bg-foreground/5 font-medium transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
