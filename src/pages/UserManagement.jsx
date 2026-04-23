import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js'; // Import untuk temp client
import { Plus, X, Upload, Check, Loader2, Users, Image as ImageIcon, Edit2, MapPin, ChevronDown, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import Cropper from 'react-easy-crop';

const roles = ['Admin', 'Mekanik', 'User'];

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [dynamicSites, setDynamicSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const siteRef = useRef(null);

  const [formData, setFormData] = useState({
    username: '', password: '', nama: '', nrp: '', jabatan: '', role: 'Mekanik', site: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (siteRef.current && !siteRef.current.contains(event.target)) {
        setShowSiteDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('nama', { ascending: true });
      if (error) throw error;
      setUsers(data || []);
      const sites = [...new Set(data.map(u => u.site).filter(Boolean))];
      setDynamicSites(sites);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getCroppedImg = async () => {
    try {
      const image = new Image();
      image.src = imageSrc;
      await new Promise(resolve => image.onload = resolve);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 300; canvas.height = 300;
      ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 300, 300);
      return canvas.toDataURL('image/jpeg');
    } catch (e) { return null; }
  };

  const handleSaveCrop = async () => {
    const cropped = await getCroppedImg();
    setCroppedImage(cropped);
    setImageSrc(null);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ username: '', password: '', nama: '', nrp: '', jabatan: '', role: 'Mekanik', site: '' });
    setCroppedImage(null);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      password: '', 
      nama: user.nama,
      nrp: user.nrp || '',
      jabatan: user.jabatan || '',
      role: user.role || 'User',
      site: user.site || '',
      password: user.password || ''
    });
    setCroppedImage(user.foto);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    if (!editingId && (!formData.username || !formData.password)) {
      setError('Username dan Password wajib diisi untuk akun baru!');
      setSubmitLoading(false);
      return;
    }

    try {
      if (editingId) {
        // Update Profile
        const { error: updateError } = await supabase.from('profiles').update({
          nama: formData.nama,
          nrp: formData.nrp,
          jabatan: formData.jabatan,
          role: formData.role,
          site: formData.site,
          foto: croppedImage,
          password: formData.password // Simpan password teks saat edit
        }).eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        // Create Auth WITHOUT overwriting current admin session
        // Kita buat client supabase sementara khusus untuk signup
        const tempSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              persistSession: false, // JANGAN simpan sesi di local storage
              autoRefreshToken: false,
              detectSessionInUrl: false
            }
          }
        );

        const authEmail = `${formData.username.toLowerCase()}@bsib.com`;
        const { data, error: authError } = await tempSupabase.auth.signUp({
          email: authEmail,
          password: formData.password,
          options: {
            data: {
              username: formData.username,
              nama: formData.nama,
              nrp: formData.nrp,
              jabatan: formData.jabatan,
              role: formData.role,
              site: formData.site,
              foto: croppedImage
            }
          }
        });

        if (authError) throw authError;

        if (data.user) {
          // Masukkan ke tabel profiles menggunakan client utama (admin)
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            username: formData.username,
            nama: formData.nama,
            nrp: formData.nrp,
            jabatan: formData.jabatan,
            role: formData.role,
            site: formData.site,
            foto: croppedImage,
            password: formData.password // Simpan password teks saat buat akun baru
          });
          if (profileError) throw profileError;
        }
      }
      setIsModalOpen(false);
      fetchUsers();
      if (!editingId) alert('User berhasil dibuat. Admin tetap dalam sesi ini.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen User</h1>
          <p className="text-foreground/60">Kelola akun dan role pengguna sistem</p>
        </div>
        <button onClick={openAddModal} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-medium shadow-lg shadow-primary/20"><Plus size={20} /> Tambah Akun</button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 text-foreground/70 text-sm border-b border-border">
                <th className="px-6 py-4 font-medium">Pengguna</th>
                <th className="px-6 py-4 font-medium">NRP</th>
                <th className="px-6 py-4 font-medium">Jabatan & Site</th>
                <th className="px-6 py-4 font-medium">Password</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-foreground/50"><Loader2 className="animate-spin mx-auto mb-2" /> Memuat...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-foreground/50">Belum ada data.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-foreground/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                          {user.foto ? <img src={user.foto} alt="" className="w-full h-full object-cover" /> : <Users size={20} className="text-primary" />}
                        </div>
                        <div><p className="font-medium">{user.nama}</p><p className="text-xs text-foreground/60">@{user.username || 'user'}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{user.nrp}</td>
                    <td className="px-6 py-4"><p className="text-sm">{user.jabatan}</p><p className="text-xs text-foreground/60 flex items-center gap-1"><MapPin size={10}/> {user.site || '-'}</p></td>
                    <td className="px-6 py-4 text-sm font-mono text-orange-500">{user.password || '******'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'Admin' ? 'bg-purple-500/10 text-purple-500' : user.role === 'Mekanik' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>{user.role}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => openEditModal(user)} className="p-2 hover:bg-primary/20 text-primary rounded-lg transition-colors inline-flex items-center gap-2"><Edit2 size={16} /><span className="text-xs font-medium">Edit</span></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Profil User' : 'Tambah Akun Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-foreground/5 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6">
              {error && (
                <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-sm mb-6 border border-red-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-500/5 p-4 rounded-xl border border-orange-500/10">
                  <div className="md:col-span-2 flex items-center gap-2 mb-2">
                    <Lock size={16} className="text-orange-600" />
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Informasi Akun</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 flex items-center gap-1.5"><UserIcon size={14}/> Username</label>
                    <input type="text" required disabled={editingId} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.replace(/\s+/g, '').toLowerCase()})} className="w-full bg-background border border-border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50" placeholder="huruf kecil" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 flex items-center gap-1.5"><Lock size={14}/> Password</label>
                    <input type="password" required={!editingId} placeholder={editingId ? 'Kosongkan jika tidak ubah' : 'Min 6 karakter'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-background border border-border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-orange-500/50" />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center overflow-hidden mb-2 bg-background relative group">
                    {croppedImage ? <img src={croppedImage} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="text-foreground/30" size={32} />}
                    <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"><Upload size={20} /><span className="text-xs mt-1 text-center font-bold">Ganti Foto</span><input type="file" accept="image/*" className="hidden" onChange={handleFileChange} /></label>
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Detail Personel</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium mb-1.5">Nama Lengkap</label><input type="text" required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none" /></div>
                    <div><label className="block text-xs font-medium mb-1.5">NRP</label><input type="text" required value={formData.nrp} onChange={e => setFormData({...formData, nrp: e.target.value})} className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none" /></div>
                    <div><label className="block text-xs font-medium mb-1.5">Jabatan</label><input type="text" required value={formData.jabatan} onChange={e => setFormData({...formData, jabatan: e.target.value})} className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none" /></div>
                    <div className="relative" ref={siteRef}>
                      <label className="block text-xs font-medium mb-1.5">Site</label>
                      <div className="relative">
                        <input type="text" placeholder="Pilih atau ketik site..." value={formData.site} onFocus={() => setShowSiteDropdown(true)} onChange={e => { setFormData({...formData, site: e.target.value}); setShowSiteDropdown(true); }} className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none pr-10" />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none"><ChevronDown size={16} /></div>
                      </div>
                      {showSiteDropdown && (
                        <div className="absolute z-30 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                          {dynamicSites.filter(s => s.toLowerCase().includes(formData.site.toLowerCase())).length > 0 ? (
                            dynamicSites.filter(s => s.toLowerCase().includes(formData.site.toLowerCase())).map(s => (
                              <button key={s} type="button" className="w-full text-left px-4 py-2.5 hover:bg-primary/10 text-sm border-b border-border/50 last:border-0" onClick={() => { setFormData({...formData, site: s}); setShowSiteDropdown(false); }}>{s}</button>
                            ))
                          ) : (
                            <div className="px-4 py-2.5 text-xs text-foreground/40 italic">Site baru akan didaftarkan</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2"><label className="block text-xs font-medium mb-1.5">Role Sistem</label><select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none">{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl hover:bg-foreground/5 font-medium transition-colors">Batal</button>
                  <button type="submit" disabled={submitLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">{submitLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} {editingId ? 'Simpan Perubahan' : 'Buat Akun'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {imageSrc && (
        <div className="fixed inset-0 bg-background/95 z-[60] flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md aspect-square bg-black rounded-lg overflow-hidden">
            <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
          </div>
          <div className="mt-6 flex gap-4"><button onClick={() => setImageSrc(null)} className="px-6 py-2 bg-card rounded-lg border border-border font-medium">Batal</button><button onClick={handleSaveCrop} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2"><Check size={18} /> Potong & Simpan</button></div>
        </div>
      )}
    </div>
  );
};
