import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Check, Loader2, Droplets, Calendar, ArrowUpRight, ArrowDownLeft, History, Database, ChevronDown, Search, Upload, Download, FileText, AlertCircle, Tag, Eye, Trash2 } from 'lucide-react';
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
  const [previewData, setPreviewData] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const fileInputRef = useRef(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
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

    const petunjuk = [
      { 'PETUNJUK PENGISIAN TEMPLATE OIL & CONSUMABLE': '=' .repeat(40) },
      { 'PETUNJUK PENGISIAN TEMPLATE OIL & CONSUMABLE': 'MODUL: Oil & General Consumable (Bukan Spare Part)' },
      { 'PETUNJUK PENGISIAN TEMPLATE OIL & CONSUMABLE': '' },
      { 'PETUNJUK PENGISIAN TEMPLATE OIL & CONSUMABLE': `Kategori valid: ${categories.join(', ')}` },
      { 'PETUNJUK PENGISIAN TEMPLATE OIL & CONSUMABLE': 'Kolom Wajib: Kategori, Nama Barang, Jumlah' },
      { 'PETUNJUK PENGISIAN TEMPLATE OIL & CONSUMABLE': 'Kolom Opsional: Merk, Satuan, Tanggal, Keterangan' },
      { 'PETUNJUK PENGISIAN TEMPLATE OIL & CONSUMABLE': 'Format Tanggal: YYYY-MM-DD (Contoh: 2026-04-24)' },
      { 'PETUNJUK PENGISIAN TEMPLATE OIL & CONSUMABLE': 'Satuan valid: Liter, Pail, Kg, Can, Pcs, Bottle, Drum' },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wsInfo = XLSX.utils.json_to_sheet(petunjuk);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Oil & Consumable");
    XLSX.utils.book_append_sheet(wb, wsInfo, "Petunjuk");
    XLSX.writeFile(wb, "Template_Bulk_OIL_CONSUMABLE.xlsx");
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Format file tidak didukung. Gunakan .xlsx atau .xls');
      return;
    }
    setError('');
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { raw: true });

        if (data.length === 0) {
          setError('File kosong atau format tidak sesuai.');
          return;
        }

        const processed = data.map((row, i) => {
          const errs = [];
          if (!row['Kategori']) errs.push('Kategori kosong');
          else if (!categories.includes(row['Kategori'])) errs.push(`Kategori "${row['Kategori']}" tidak valid`);
          if (!row['Nama Barang']) errs.push('Nama Barang kosong');
          if (!row['Jumlah'] || isNaN(parseInt(row['Jumlah'], 10))) errs.push('Jumlah harus angka');

          return {
            rowNum: i + 1,
            kategori: row['Kategori'] || '-',
            nama: row['Nama Barang'] || '-',
            merk: (row['Merk'] && row['Merk'] !== '-') ? row['Merk'] : null,
            jumlah: parseInt(row['Jumlah'], 10) || 0,
            satuan: row['Satuan'] || 'Liter',
            tanggal: (() => {
              const rawDate = row['Tanggal'];
              if (!rawDate) return new Date().toISOString().split('T')[0];
              if (typeof rawDate === 'number') {
                const date = new Date((rawDate - 25569) * 86400 * 1000);
                return date.toISOString().split('T')[0];
              }
              return rawDate;
            })(),
            keterangan: row['Keterangan'] || 'Bulk Upload',
            isValid: errs.length === 0,
            errors: errs,
          };
        });

        setPreviewData(processed);
        setBulkStatus({ total: 0, current: 0, errors: [] });
      } catch (err) {
        setError('Gagal membaca file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Step 2: Upload baris yang valid setelah user konfirmasi
  const handleBulkSubmit = async () => {
    const validRows = previewData.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setSubmitLoading(true);
    setError('');
    setBulkStatus({ total: validRows.length, current: 0, errors: [] });

    try {
      // Create payload for RPC
      const payload = validRows.map(row => ({
        nama: row.nama,
        kategori: row.kategori,
        satuan: row.satuan,
        merk: row.merk,
        jumlah: row.jumlah,
        tanggal: row.tanggal,
        keterangan: row.keterangan
      }));

      // Use RPC for atomicity
      const { error: rpcError } = await supabase.rpc('bulk_upload_oil_consumables', {
        payload: payload,
        p_user_id: user.id,
        p_nama_user: profile?.nama || 'Unknown'
      });

      if (rpcError) throw rpcError;

      // If successful
      resetBulkModal();
      setIsBulkModalOpen(false);
      fetchData();
      setBulkStatus({ total: 0, current: 0, errors: [] });

    } catch (err) {
      console.error(err);
      setError(`Upload Gagal: ${err.message}. Tidak ada data yang tersimpan.`);
      setBulkStatus(prev => ({ ...prev, errors: [err.message] }));
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetBulkModal = () => {
    setPreviewData([]);
    setSelectedFileName('');
    setIsDragOver(false);
    setBulkStatus({ total: 0, current: 0, errors: [] });
    setError('');
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
          <button onClick={() => { setIsBulkModalOpen(true); resetBulkModal(); }} className="bg-background border border-primary text-primary hover:bg-primary/5 px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-medium">
            <Upload size={20} /> Bulk Upload
          </button>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-medium shadow-lg shadow-primary/20">
            <Plus size={20} /> Input Barang Masuk
          </button>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border border-border">
        <div className="flex flex-1 w-full gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama barang atau merk..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border pl-10 pr-4 py-2 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            />
          </div>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-background border border-border px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="All">Semua Kategori</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
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
                {(() => {
                  const filteredInventory = inventory.filter(item => {
                    const matchesSearch = 
                      item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.merk && item.merk.toLowerCase().includes(searchQuery.toLowerCase()));
                    const matchesCategory = selectedCategory === 'All' || item.kategori === selectedCategory;
                    return matchesSearch && matchesCategory;
                  });

                  if (loading) return <tr><td colSpan="5" className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>;
                  if (filteredInventory.length === 0) return <tr><td colSpan="5" className="px-6 py-12 text-center text-foreground/40 italic">Data tidak ditemukan.</td></tr>;

                  return filteredInventory.map(item => (
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
                  ));
                })()}
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
                {(() => {
                  const filteredHistory = history.filter(item => {
                    const matchesSearch = 
                      item.oil_consumables?.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.keterangan && item.keterangan.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      (item.nama_user && item.nama_user.toLowerCase().includes(searchQuery.toLowerCase()));
                    const matchesCategory = selectedCategory === 'All' || item.oil_consumables?.kategori === selectedCategory;
                    return matchesSearch && matchesCategory;
                  });

                  if (loading) return <tr><td colSpan="4" className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>;
                  if (filteredHistory.length === 0) return <tr><td colSpan="4" className="px-6 py-12 text-center text-foreground/40 italic">Riwayat tidak ditemukan.</td></tr>;

                  return filteredHistory.map(item => (
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
                  ));
                })()}
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
          <div className={`bg-card border border-border rounded-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col ${previewData.length > 0 ? 'max-w-5xl h-[90vh]' : 'max-w-3xl'}`}>
            <div className="flex justify-between items-center p-6 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl text-primary">
                  <Droplets size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Bulk Upload Oil & Consumable</h2>
                  <p className="text-xs text-foreground/60">Upload data massal melalui file Excel (.xlsx)</p>
                </div>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-foreground/5 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-sm border border-red-500/20 flex gap-3 mb-6">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Terjadi Kesalahan</p>
                    <p>{error}</p>
                    {bulkStatus.errors.length > 0 && (
                      <ul className="mt-2 list-disc list-inside max-h-28 overflow-y-auto text-xs opacity-80">
                        {bulkStatus.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                        {bulkStatus.errors.length > 10 && <li>...dan {bulkStatus.errors.length - 10} lainnya</li>}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {previewData.length === 0 ? (
                /* Mode 1: Dropzone */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">Gunakan Template</h3>
                          <p className="text-xs text-foreground/60">Pastikan format file sesuai dengan template.</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleDownloadTemplate}
                        className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm"
                      >
                        <Download size={18} /> Unduh Template Oil & Consumable (.xlsx)
                      </button>
                    </div>

                    <div className="bg-foreground/5 p-5 rounded-2xl border border-border">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/40 mb-3">Petunjuk Singkat:</h4>
                      <ul className="text-xs space-y-2 text-foreground/70">
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>Kategori harus sesuai (Lube, General Consumable)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>Kolom Nama & Jumlah wajib diisi</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>Format tanggal: YYYY-MM-DD</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
                    className={`relative border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center p-8 text-center min-h-[280px] group
                      ${isDragOver ? 'border-primary bg-primary/5 scale-[0.98]' : 'border-border hover:border-primary/50 hover:bg-foreground/5'}`}
                  >
                    <div className={`p-5 rounded-full mb-4 transition-transform duration-300 ${isDragOver ? 'bg-primary text-white scale-110' : 'bg-primary/10 text-primary group-hover:scale-110'}`}>
                      <Upload size={32} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Pilih File atau Taruh di Sini</h3>
                    <p className="text-sm text-foreground/60 mb-6">Mendukung format .xlsx dan .xls (Maks. 5MB)</p>
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      Pilih File
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept=".xlsx, .xls" 
                      onChange={(e) => handleFileSelect(e.target.files[0])} 
                    />
                  </div>
                </div>
              ) : (
                /* Mode 2: Preview & Confirmation */
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-foreground/5 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                        <Check size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{selectedFileName}</p>
                        <p className="text-xs text-foreground/60">Terdeteksi {previewData.length} baris data</p>
                      </div>
                    </div>
                    <button 
                      onClick={resetBulkModal}
                      className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Batalkan & Ganti File
                    </button>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-background border-b border-border z-10">
                        <tr>
                          <th className="px-4 py-3 font-bold w-12">No</th>
                          <th className="px-4 py-3 font-bold">Item</th>
                          <th className="px-4 py-3 font-bold">Kategori</th>
                          <th className="px-4 py-3 font-bold text-right">Jumlah</th>
                          <th className="px-4 py-3 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {previewData.map((row, idx) => (
                          <tr key={idx} className={`hover:bg-foreground/5 ${!row.isValid ? 'bg-red-500/5' : ''}`}>
                            <td className="px-4 py-3 text-foreground/50">{row.rowNum}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{row.nama}</p>
                              <p className="text-[10px] text-foreground/40 font-mono italic">{row.merk || '-'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full bg-foreground/5 border border-border text-[10px]">{row.kategori}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold">{row.jumlah} {row.satuan}</td>
                            <td className="px-4 py-3">
                              {row.isValid ? (
                                <span className="text-emerald-500 flex items-center gap-1 font-bold"><Check size={12}/> Siap</span>
                              ) : (
                                <div className="text-red-500 group relative cursor-help">
                                  <span className="flex items-center gap-1 font-bold underline decoration-dotted underline-offset-2"><AlertCircle size={12}/> Error</span>
                                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-red-600 text-white text-[10px] rounded shadow-xl hidden group-hover:block z-20 animate-in fade-in zoom-in-95">
                                    {row.errors.join(', ')}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex gap-4 items-center">
                    <div className="bg-primary/10 p-3 rounded-full text-primary shrink-0">
                      <Eye size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Review Data Anda</p>
                      <p className="text-xs text-foreground/60">Pastikan data di atas sudah benar. Hanya baris dengan status "Siap" yang akan diupload.</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider mb-1">Data Valid</p>
                      <p className="text-xl font-black text-primary">{previewData.filter(r => r.isValid).length} / {previewData.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-card flex justify-between items-center shrink-0">
              {submitLoading ? (
                <div className="flex-1 flex items-center gap-4 pr-6">
                  <div className="flex-1 bg-foreground/10 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: `${(bulkStatus.current / bulkStatus.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">{bulkStatus.current} / {bulkStatus.total}</span>
                </div>
              ) : (
                <div className="text-xs text-foreground/40 italic">
                  * Item baru akan didaftarkan otomatis jika belum ada di database.
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsBulkModalOpen(false)} 
                  className="px-6 py-2.5 rounded-xl hover:bg-foreground/5 font-bold transition-colors"
                  disabled={submitLoading}
                >
                  Batal
                </button>
                {previewData.length > 0 && (
                  <button 
                    onClick={handleBulkSubmit}
                    disabled={submitLoading || previewData.filter(r => r.isValid).length === 0}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {submitLoading ? (
                      <><Loader2 className="animate-spin" size={20} /> Mengupload...</>
                    ) : (
                      <><Check size={20} /> Upload Sekarang</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
