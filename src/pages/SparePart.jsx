import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Check, Loader2, Package, Calendar, ArrowUpRight, ArrowDownLeft, History, Database, ChevronDown, Search, Upload, Download, FileText, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const categories = ['ANFO Truck', 'Compressor', 'Forklift', 'Genset', 'HWB', 'MMU', 'OSP'];
const units = ['pcs', 'pair', 'meter', 'bal', 'can', 'set', 'roll', 'box'];

export const SparePart = () => {
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
    sparepart_id: '', 
    nama_sparepart: '',
    part_number: '',
    merk: '',
    kategori: 'MMU',
    jumlah: '',
    satuan: 'pcs',
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
          merk: formData.merk || '-',
          kategori: formData.kategori,
          satuan: formData.satuan,
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

  const handleExportCSV = () => {
    const dataToExport = activeTab === 'inventory' 
      ? inventory.map(i => ({ 
          'Nama Sparepart': i.nama_sparepart, 
          'P/N': i.part_number || '-', 
          'Merk': i.merk || '-',
          'Kategori': i.kategori, 
          'Stok': i.stok,
          'Satuan': i.satuan,
          'Terakhir Update': new Date(i.updated_at).toLocaleString('id-ID')
        }))
      : history.map(h => ({
          'Tanggal': h.tanggal,
          'Sparepart': h.spareparts?.nama_sparepart,
          'Kategori': h.spareparts?.kategori,
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
    link.setAttribute("download", `Export_Sparepart_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const data = [
      {
        'Kategori': 'MMU',
        'Nama Sparepart': 'Contoh Sparepart A',
        'Part Number': 'PN-12345',
        'Merk': 'Toyota',
        'Jumlah': 10,
        'Satuan': 'pcs',
        'Tanggal': new Date().toISOString().split('T')[0],
        'Keterangan': 'Pemasukan rutin'
      },
      {
        'Kategori': 'OSP',
        'Nama Sparepart': 'Contoh Sparepart B',
        'Part Number': '',
        'Merk': 'Fleetguard',
        'Jumlah': 5,
        'Satuan': 'pair',
        'Tanggal': new Date().toISOString().split('T')[0],
        'Keterangan': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Bulk_Sparepart.xlsx");
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
            if (!row['Kategori'] || !row['Nama Sparepart'] || !row['Jumlah']) {
              throw new Error(`Baris ${i + 1}: Kategori, Nama, dan Jumlah wajib diisi.`);
            }

            if (!categories.includes(row['Kategori'])) {
              throw new Error(`Baris ${i + 1}: Kategori "${row['Kategori']}" tidak valid.`);
            }

            let spId;
            const { data: existing, error: findError } = await supabase
              .from('spareparts')
              .select('id')
              .eq('nama_sparepart', row['Nama Sparepart'])
              .eq('kategori', row['Kategori'])
              .maybeSingle();

            if (findError) throw findError;

            if (existing) {
              spId = existing.id;
            } else {
              const { data: newSp, error: spError } = await supabase.from('spareparts').insert({
                nama_sparepart: row['Nama Sparepart'],
                part_number: row['Part Number'] || null,
                merk: row['Merk'] || '-',
                kategori: row['Kategori'],
                satuan: row['Satuan'] || 'pcs',
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
    setFormData({ sparepart_id: '', nama_sparepart: '', part_number: '', merk: '', kategori: 'MMU', jumlah: '', satuan: 'pcs', tanggal: new Date().toISOString().split('T')[0], keterangan: '' });
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
                  <th className="px-6 py-4 font-medium">Sparepart</th>
                  <th className="px-6 py-4 font-medium">Merk</th>
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
                      <td className="px-6 py-4 text-sm text-foreground/70">{item.merk || '-'}</td>
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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Merk (Opsional)</label>
                      <input type="text" value={formData.merk} onChange={e => setFormData({...formData, merk: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Contoh: Toyota" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Part Number (Opsional)</label>
                      <input type="text" value={formData.part_number} onChange={e => setFormData({...formData, part_number: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 font-mono" placeholder="P/N jika ada" />
                    </div>
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
                  {submitLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Simpan Stok Masuk
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
              <h2 className="text-xl font-bold">Bulk Upload Spare Part</h2>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-foreground/5 rounded-full"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-sm border border-red-500/20 flex gap-3">
                  <AlertCircle size={20} className="shrink-0" />
                  <div>
                    <p className="font-bold">Terjadi Kesalahan</p>
                    <p>{error}</p>
                    {bulkStatus.errors.length > 0 && (
                      <ul className="mt-2 list-disc list-inside max-h-32 overflow-y-auto text-xs opacity-80">
                        {bulkStatus.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                        {bulkStatus.errors.length > 10 && <li>...dan {bulkStatus.errors.length - 10} lainnya</li>}
                      </ul>
                    )}
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
                    <p className="text-xs text-foreground/60">Unduh template Excel untuk memastikan format data sesuai.</p>
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
                <label className="block text-sm font-medium">Pilih File Excel</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:bg-foreground/5 transition-colors group relative overflow-hidden">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-foreground/40 group-hover:text-primary transition-colors" />
                    <p className="mb-2 text-sm text-foreground/60"><span className="font-bold text-primary">Klik untuk upload</span> atau drag and drop</p>
                    <p className="text-xs text-foreground/40">XLSX, XLS (Maks. 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleBulkUpload} disabled={submitLoading} />
                  
                  {submitLoading && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <div className="text-center">
                        <p className="text-sm font-bold">Memproses Data...</p>
                        <p className="text-xs text-foreground/60">{bulkStatus.current} dari {bulkStatus.total}</p>
                      </div>
                      <div className="w-2/3 bg-foreground/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300" 
                          style={{ width: `${(bulkStatus.current / bulkStatus.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <div className="bg-foreground/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/40 mb-2">Petunjuk:</h4>
                <ul className="text-xs space-y-1.5 text-foreground/70">
                  <li>• Kolom <span className="font-mono font-bold">Kategori</span> harus sesuai: {categories.join(', ')}.</li>
                  <li>• Kolom <span className="font-mono font-bold">Nama Sparepart</span> dan <span className="font-mono font-bold">Jumlah</span> wajib diisi.</li>
                  <li>• Format tanggal: <span className="font-mono font-bold">YYYY-MM-DD</span>.</li>
                  <li>• Item baru akan otomatis didaftarkan jika belum ada.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-border bg-card">
              <button 
                onClick={() => setIsBulkModalOpen(false)} 
                className="px-5 py-2.5 rounded-xl hover:bg-foreground/5 font-medium transition-colors"
                disabled={submitLoading}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
