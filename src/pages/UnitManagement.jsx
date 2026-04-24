import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, Plus, Search, Edit2, Trash2, X, Check,
  Settings, Activity, History, Loader2, ChevronRight,
  Package, Droplets, Calendar, Wrench
} from 'lucide-react';

export const UnitManagement = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('list');
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [formData, setFormData] = useState({
    id: '', type: '', pabrikan: '', model: '', current_hm: 0, site: profile?.site || ''
  });

  const availableCategories = [...new Set(units.map(u => u.type))];

  useEffect(() => {
    if (profile?.site) setFormData(prev => ({ ...prev, site: profile.site }));
    fetchUnits();
  }, [profile]);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('units').select('*').order('id');
      if (error) throw error;
      setUnits(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceHistory = async (unitId) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_records')
        .select(`*, service_parts(jumlah, spareparts(nama_sparepart, satuan)), service_oils(jumlah, oil_consumables(nama_barang, satuan))`)
        .eq('unit_id', unitId)
        .order('tanggal', { ascending: false });
      if (error) throw error;
      setServiceHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = (unit) => {
    navigate(`/unit/${unit.id}/history`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('units').update({
          type: formData.type, pabrikan: formData.pabrikan,
          model: formData.model, current_hm: formData.current_hm
        }).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('units').insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ id: '', type: '', pabrikan: '', model: '', current_hm: 0, site: profile?.site || '' });
      fetchUnits();
    } catch (err) {
      alert('Gagal menyimpan unit: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const deleteUnit = async (id) => {
    if (!window.confirm('Hapus unit ini?')) return;
    try {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
      fetchUnits();
    } catch (err) {
      alert('Gagal menghapus unit: ' + err.message);
    }
  };

  const filteredUnits = units.filter(u =>
    u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const serviceTypeColor = (type) => {
    if (type?.includes('Periodic')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (type?.includes('Repair') || type?.includes('Breakdown')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (type?.includes('Overhaul')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    return 'bg-primary/10 text-primary border-primary/20';
  };

  // ─── SERVICE HISTORY FULL PAGE VIEW ────────────────────────────────────────
  if (view === 'history' && selectedUnit) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('list')}
              className="p-3 bg-card border border-border rounded-2xl hover:bg-foreground/5 transition-all group"
            >
              <ChevronRight size={22} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Riwayat Service Unit</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{selectedUnit.id}</h1>
            </div>
          </div>

          {/* Unit Info Card */}
          <div className="hidden md:flex items-center gap-6 bg-card border border-border rounded-2xl px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest">{selectedUnit.type}</p>
                <p className="font-bold">{selectedUnit.pabrikan} {selectedUnit.model}</p>
              </div>
            </div>
            <div className="border-l border-border pl-6">
              <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest">HM Saat Ini</p>
              <p className="font-mono font-black text-orange-500">{Number(selectedUnit.current_hm).toLocaleString()} <span className="text-xs text-foreground/40">HM</span></p>
            </div>
            <div className="border-l border-border pl-6">
              <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest">Total Service</p>
              <p className="font-black text-2xl">{serviceHistory.length}</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 md:hidden">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-black">{serviceHistory.length}</p>
            <p className="text-[10px] text-foreground/40 font-bold uppercase mt-1">Total Service</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-orange-500">{Number(selectedUnit.current_hm).toLocaleString()}</p>
            <p className="text-[10px] text-foreground/40 font-bold uppercase mt-1">HM</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-sm font-black">{selectedUnit.site}</p>
            <p className="text-[10px] text-foreground/40 font-bold uppercase mt-1">Site</p>
          </div>
        </div>

        {/* History Timeline */}
        {historyLoading ? (
          <div className="flex flex-col items-center py-24 text-foreground/40 gap-3">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-medium">Memuat riwayat service...</p>
          </div>
        ) : serviceHistory.length === 0 ? (
          <div className="flex flex-col items-center py-24 border-2 border-dashed border-border rounded-3xl text-foreground/40 gap-4">
            <History size={48} className="opacity-20" />
            <div className="text-center">
              <p className="font-bold">Belum ada riwayat service</p>
              <p className="text-sm mt-1">Riwayat akan muncul otomatis setelah laporan dibuat di menu Report.</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden md:block" />

            <div className="space-y-6">
              {serviceHistory.map((rec, idx) => (
                <div key={rec.id} className="relative md:pl-20 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                  {/* Timeline dot */}
                  <div className={`hidden md:flex absolute left-4 top-6 w-9 h-9 rounded-full border-2 items-center justify-center ${serviceTypeColor(rec.service_type)}`}>
                    <Wrench size={14} />
                  </div>

                  <div className="bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
                    {/* Record Header */}
                    <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background/30">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${serviceTypeColor(rec.service_type)}`}>
                          {rec.service_type}
                        </span>
                        <div className="flex items-center gap-1.5 text-sm font-bold">
                          <Calendar size={14} className="text-foreground/40" />
                          {new Date(rec.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Activity size={14} className="text-orange-500" />
                          <span className="font-mono font-black text-orange-500">{rec.hm_service?.toLocaleString() || 0}</span>
                          <span className="text-xs text-foreground/40 font-bold">HM</span>
                        </div>
                        <span className="text-xs text-foreground/40">Mekanik: <span className="font-bold text-foreground">{rec.nama_user || '-'}</span></span>
                      </div>
                    </div>

                    {/* Parts & Oils */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Spare Parts */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Package size={14} className="text-orange-500" />
                          <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Spare Part Digunakan</p>
                        </div>
                        {rec.service_parts?.length > 0 ? (
                          <div className="space-y-2">
                            {rec.service_parts.map((p, i) => (
                              <div key={i} className="flex items-center justify-between bg-orange-500/5 border border-orange-500/10 rounded-xl px-4 py-2.5">
                                <span className="text-sm font-medium">{p.spareparts?.nama_sparepart || '-'}</span>
                                <span className="text-sm font-black text-orange-500">{p.jumlah} <span className="font-normal text-foreground/40">{p.spareparts?.satuan}</span></span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-foreground/30 italic py-2">Tidak ada penggantian part</p>
                        )}
                      </div>

                      {/* Oils */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Droplets size={14} className="text-primary" />
                          <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Oli / Lube Digunakan</p>
                        </div>
                        {rec.service_oils?.length > 0 ? (
                          <div className="space-y-2">
                            {rec.service_oils.map((o, i) => (
                              <div key={i} className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5">
                                <span className="text-sm font-medium">{o.oil_consumables?.nama_barang || '-'}</span>
                                <span className="text-sm font-black text-primary">{o.jumlah} <span className="font-normal text-foreground/40">{o.oil_consumables?.satuan}</span></span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-foreground/30 italic py-2">Tidak ada penggunaan oli</p>
                        )}
                      </div>

                      {/* Keterangan */}
                      {rec.keterangan && (
                        <div className="col-span-2 pt-4 border-t border-border">
                          <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">Keterangan / Temuan</p>
                          <p className="text-sm leading-relaxed text-foreground/80 bg-foreground/5 rounded-xl px-4 py-3">{rec.keterangan}</p>
                        </div>
                      )}
                    </div>

                    <div className="px-5 py-2 bg-background/20 text-[10px] text-foreground/30 flex justify-end">
                      Record ID: {rec.id.split('-')[0]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── UNIT LIST VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Unit</h1>
          <p className="text-foreground/60 mt-1">Kelola aset dan informasi Hour Meter unit operasional.</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={20} /> Tambah Unit
        </button>
      </div>

      {/* Search */}
      <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={18} />
          <input
            type="text"
            placeholder="Cari nomor lambung atau model unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Units Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-foreground/40 uppercase tracking-wider border-b border-border">
                <th className="px-6 py-4">Nomor Lambung</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Pabrikan / Model</th>
                <th className="px-6 py-4">HM Saat Ini</th>
                <th className="px-6 py-4">Site</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-foreground/40 italic">Memuat data unit...</td></tr>
              ) : filteredUnits.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-foreground/40">Belum ada unit yang terdaftar.</td></tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-foreground/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                          <Truck size={20} />
                        </div>
                        <span className="font-bold">{unit.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-foreground/5 rounded-md text-xs font-bold">{unit.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{unit.pabrikan}</div>
                      <div className="text-[10px] text-foreground/40 uppercase tracking-widest">{unit.model}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-orange-500" />
                        <span className="font-mono font-bold text-sm">{Number(unit.current_hm).toLocaleString()}</span>
                        <span className="text-[10px] text-foreground/40 font-bold uppercase">HM</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{unit.site}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openHistory(unit)}
                          className="p-2 hover:bg-orange-500/20 text-orange-500 rounded-lg transition-colors"
                          title="Riwayat Service"
                        >
                          <History size={18} />
                        </button>
                        <button
                          onClick={() => { setEditingId(unit.id); setFormData(unit); setIsModalOpen(true); }}
                          className="p-2 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteUnit(unit.id)}
                          className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-border flex justify-between items-center bg-background/30">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings className="text-primary" />
                {editingId ? 'Edit Unit' : 'Tambah Unit Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 relative">
                  <label className="block text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">Kategori Unit</label>
                  <div className="relative">
                    <input
                      type="text" required
                      placeholder="Ketik atau pilih kategori (Contoh: Excavator)"
                      value={formData.type}
                      onFocus={() => setShowCategoryList(true)}
                      onChange={e => { setFormData({ ...formData, type: e.target.value }); setShowCategoryList(true); }}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30" size={16} />
                  </div>
                  {showCategoryList && availableCategories.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-card border border-border rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                      {availableCategories.filter(cat => cat.toLowerCase().includes(formData.type.toLowerCase())).map(cat => (
                        <button key={cat} type="button"
                          onClick={() => { setFormData({ ...formData, type: cat }); setShowCategoryList(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors border-b border-border/50 last:border-0 text-sm font-bold"
                        >{cat}</button>
                      ))}
                    </div>
                  )}
                  {showCategoryList && <div className="fixed inset-0 z-10" onClick={() => setShowCategoryList(false)} />}
                </div>

                <div className={editingId ? 'col-span-2 opacity-60' : 'col-span-2'}>
                  <label className="block text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">Nomor Lambung</label>
                  <input type="text" required disabled={!!editingId} placeholder="Contoh: EXC-01"
                    value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">Pabrikan</label>
                  <input type="text" required placeholder="Contoh: Komatsu"
                    value={formData.pabrikan} onChange={e => setFormData({ ...formData, pabrikan: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">Tipe / Model</label>
                  <input type="text" required placeholder="Contoh: PC200-8"
                    value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">HM Saat Ini</label>
                  <input type="number" required value={formData.current_hm}
                    onChange={e => setFormData({ ...formData, current_hm: Number(e.target.value) })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">Site</label>
                  <input type="text" readOnly value={formData.site}
                    className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-3 outline-none text-foreground/40 cursor-not-allowed font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-border mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-2xl border border-border font-bold hover:bg-foreground/5 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={submitLoading}
                  className="flex-1 px-6 py-3 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  {submitLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={18} />}
                  Simpan Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
