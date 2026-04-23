# BSIB Maintenance Management System 🛠️

A modern, fast, and responsive web application for managing maintenance operations at PT BSIB. Built with React, Vite, and Supabase.

## 🚀 Key Features

- **📊 Intelligent Dashboard**: Real-time analytics with interactive charts (Trends & Distribution).
- **📦 Spare Part Inventory**: Smart master inventory with IN/OUT transaction history.
- **🔍 Smart Dropdowns**: Context-aware searchable selections for parts and sites.
- **👥 User Management**: Role-based access control (Admin, Mekanik, User) with profile editing.
- **📱 PWA Ready**: Installable on mobile and desktop for offline-ready experience.
- **🎨 Premium UI**: Modern Dark Purple theme with smooth animations and responsive layouts.

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Deployment**: Ready for Vercel / Netlify

## ⚙️ Local Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd maintenance-bsib
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**:
   Run the content of `database_setup.sql` in your Supabase SQL Editor to create the necessary tables, triggers, and RLS policies.

5. **Run the app**:
   ```bash
   npm run dev
   ```

## 📝 Roadmap

- [x] Spare Part Inventory Module
- [x] User Management Module
- [x] Interactive Dashboard
- [ ] Tools Management Module (In Dev)
- [ ] Unit Performance Tracking (In Dev)
- [ ] Automated Reporting System (In Dev)

---
Developed by **BSIB Maintenance Team**
