import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, imageUrl } from '../lib/supabase.ts';
import {
  Shield,
  RotateCcw,
  Search,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';

interface AdminStats {
  total_photos?: number;
  active_photos?: number;
  total_users?: number;
  real_users?: number;
  non_guest_users?: number;
  games_today?: number;
  games_total?: number;
  total_games?: number;
  open_reports?: number;
  [key: string]: any;
}

interface PhotoItem {
  id?: string | number;
  photo_id?: string | number;
  image_path?: string;
  image_url?: string;
  url?: string;
  true_year?: number;
  year?: number;
  caption?: string;
  fun_fact?: string;
  category?: string;
  is_active?: boolean;
  [key: string]: any;
}

interface ReportItem {
  id?: string | number;
  report_id?: string | number;
  reason?: string;
  report_reason?: string;
  photo_id?: string | number;
  image_path?: string;
  image_url?: string;
  url?: string;
  year?: number;
  true_year?: number;
  caption?: string;
  is_active?: boolean;
  created_at?: string;
  photo?: {
    id?: string | number;
    image_path?: string;
    image_url?: string;
    url?: string;
    true_year?: number;
    year?: number;
    caption?: string;
    is_active?: boolean;
  };
  [key: string]: any;
}

interface UserItem {
  id?: string;
  email?: string | null;
  is_anonymous?: boolean;
  is_guest?: boolean;
  created_at?: string;
  last_sign_in_at?: string;
  display_name?: string | null;
  [key: string]: any;
}

// Inline Photo Row Editor for Photos Tab
const PhotoRowEditor: React.FC<{
  photo: PhotoItem;
  onRefresh: () => void;
}> = ({ photo, onRefresh }) => {
  const photoId = photo.photo_id ?? photo.id;
  const initialYear = photo.true_year ?? photo.year ?? '';
  const initialCaption = photo.caption ?? '';
  const initialFunFact = photo.fun_fact ?? '';
  const initialCategory = photo.category ?? '';
  const initialIsActive = photo.is_active !== false;

  const [trueYear, setTrueYear] = useState<string | number>(initialYear);
  const [caption, setCaption] = useState<string>(initialCaption);
  const [funFact, setFunFact] = useState<string>(initialFunFact);
  const [category, setCategory] = useState<string>(initialCategory);
  const [isActive, setIsActive] = useState<boolean>(initialIsActive);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  // Sync if prop changes
  useEffect(() => {
    setTrueYear(photo.true_year ?? photo.year ?? '');
    setCaption(photo.caption ?? '');
    setFunFact(photo.fun_fact ?? '');
    setCategory(photo.category ?? '');
    setIsActive(photo.is_active !== false);
  }, [photo]);

  const yearChanged = String(trueYear).trim() !== String(initialYear).trim();
  const captionChanged = caption.trim() !== initialCaption.trim();
  const funFactChanged = funFact.trim() !== initialFunFact.trim();
  const categoryChanged = category.trim() !== initialCategory.trim();
  const activeChanged = isActive !== initialIsActive;

  const hasChanges = yearChanged || captionChanged || funFactChanged || categoryChanged || activeChanged;

  const handleSave = async () => {
    if (!photoId || !hasChanges) return;

    setIsSaving(true);
    setRowError(null);
    setSaveSuccess(false);

    try {
      // Build body with only changed fields included
      const body: Record<string, any> = {
        action: 'update_photo',
        photo_id: photoId,
      };

      if (yearChanged) {
        const parsedYear = Number(trueYear);
        if (!isNaN(parsedYear)) {
          body.true_year = parsedYear;
        }
      }
      if (captionChanged) {
        body.caption = caption.trim();
      }
      if (funFactChanged) {
        body.fun_fact = funFact.trim();
      }
      if (categoryChanged) {
        body.category = category.trim();
      }
      if (activeChanged) {
        body.is_active = isActive;
      }

      // Invoke update_photo with changed fields
      const { error: updateError } = await supabase.functions.invoke('admin-action', {
        body,
      });

      if (updateError) {
        throw updateError;
      }

      // If active state changed, also ensure toggle_photo_active is called if needed
      if (activeChanged) {
        try {
          await supabase.functions.invoke('admin-action', {
            body: {
              action: 'toggle_photo_active',
              photo_id: photoId,
              is_active: isActive,
            },
          });
        } catch {
          // If update_photo already set it, ignore
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to update photo:', err);
      setRowError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const imageUrl = photo.image_url ?? photo.url ?? '';

  return (
    <tr className="border-b border-stone-800 hover:bg-stone-900/40 text-xs">
      {/* Thumbnail */}
      <td className="p-3 align-top w-20">
        {imageUrl ? (
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open full image"
            className="block relative group"
          >
            <img
              src={imageUrl}
              alt={caption || 'Archival photo'}
              className="w-16 h-16 object-cover rounded border border-stone-700 bg-stone-950"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
              <ExternalLink className="w-3.5 h-3.5 text-stone-200" />
            </div>
          </a>
        ) : (
          <div className="w-16 h-16 rounded border border-stone-800 bg-stone-950 flex items-center justify-center text-[10px] text-stone-600">
            No img
          </div>
        )}
        <div className="text-[10px] text-stone-500 font-mono mt-1 truncate max-w-[70px]" title={String(photoId)}>
          ID: {String(photoId).slice(0, 6)}…
        </div>
      </td>

      {/* Year */}
      <td className="p-3 align-top w-24">
        <label className="text-[10px] text-stone-400 block mb-1">Year</label>
        <input
          type="number"
          value={trueYear}
          onChange={(e) => setTrueYear(e.target.value)}
          className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-stone-100 font-mono text-xs focus:outline-none focus:border-amber-500"
          placeholder="1950"
        />
      </td>

      {/* Caption & Fun Fact */}
      <td className="p-3 align-top space-y-2">
        <div>
          <label className="text-[10px] text-stone-400 block mb-1">Caption</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
            placeholder="Photo caption or description"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-400 block mb-1">Fun Fact / Context</label>
          <textarea
            rows={2}
            value={funFact}
            onChange={(e) => setFunFact(e.target.value)}
            className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-stone-100 text-xs focus:outline-none focus:border-amber-500 resize-y"
            placeholder="Historical context or fun fact shown on results screen"
          />
        </div>
        {rowError && <p className="text-[11px] text-rose-400">{rowError}</p>}
      </td>

      {/* Category */}
      <td className="p-3 align-top w-32">
        <label className="text-[10px] text-stone-400 block mb-1">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
          placeholder="e.g. daily, general"
        />
      </td>

      {/* Active Toggle */}
      <td className="p-3 align-top w-28 text-center">
        <label className="text-[10px] text-stone-400 block mb-1">Status</label>
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors inline-flex items-center gap-1 ${
            isActive
              ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
              : 'bg-rose-950/60 border-rose-700/60 text-rose-300 hover:bg-rose-900/60'
          }`}
        >
          {isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>{isActive ? 'Active' : 'Inactive'}</span>
        </button>
      </td>

      {/* Actions */}
      <td className="p-3 align-top w-24 text-right">
        <label className="text-[10px] text-stone-400 block mb-1">Action</label>
        <button
          type="button"
          disabled={!hasChanges || isSaving}
          onClick={handleSave}
          className={`w-full py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1 border transition-all ${
            hasChanges
              ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 border-amber-500 cursor-pointer shadow-sm'
              : 'bg-stone-850 text-stone-500 border-stone-750 cursor-not-allowed opacity-60'
          }`}
        >
          {isSaving ? (
            <span>Saving...</span>
          ) : saveSuccess ? (
            <span className="text-emerald-300 flex items-center gap-0.5">
              <Check className="w-3 h-3" /> Saved
            </span>
          ) : (
            <>
              <Save className="w-3 h-3" />
              <span>Save</span>
            </>
          )}
        </button>
      </td>
    </tr>
  );
};

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();

  // Access validation: verified by calling supabase.rpc('admin_stats')
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'reports' | 'photos' | 'users'>('reports');

  // Reports state
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportActionLoading, setReportActionLoading] = useState<Record<string, boolean>>({});

  // Photos state
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [photoOffset, setPhotoOffset] = useState(0);
  const photoLimit = 50;

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userOffset, setUserOffset] = useState(0);
  const userLimit = 50;

  // 1. Initial auth check & stats load
  // If it errors or returns nothing (meaning current user isn't admin), redirect home immediately without error
  useEffect(() => {
    let isMounted = true;

    const checkAdminAccess = async () => {
      try {
        const { data, error } = await supabase.rpc('admin_stats');
        if (error || !data) {
          navigate('/', { replace: true });
          return;
        }

        const statObj = Array.isArray(data) ? data[0] : data;
        if (!statObj || typeof statObj !== 'object') {
          navigate('/', { replace: true });
          return;
        }

        if (isMounted) {
          setStats(statObj);
          setIsAuthorized(true);
        }
      } catch {
        navigate('/', { replace: true });
      }
    };

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Refresh Stats
  const refreshStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_stats');
      if (!error && data) {
        const statObj = Array.isArray(data) ? data[0] : data;
        if (statObj) setStats(statObj);
      }
    } catch (err) {
      console.warn('Failed to refresh stats:', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // 2. Load Reports
  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const { data, error } = await supabase.rpc('admin_list_reports');
      if (error) throw error;
      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load reports:', err);
      setReportsError(err.message || 'Failed to load reports. Please try again.');
    } finally {
      setReportsLoading(false);
    }
  }, []);

  // 3. Load Photos (with debounced search)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(photoSearchQuery);
      setPhotoOffset(0); // reset to page 1 on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [photoSearchQuery]);

  const loadPhotos = useCallback(async () => {
    setPhotosLoading(true);
    setPhotosError(null);
    try {
      const { data, error } = await supabase.rpc('admin_list_photos', {
        p_search: debouncedSearch,
        p_limit: photoLimit,
        p_offset: photoOffset,
      });
      if (error) throw error;
      setPhotos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load photos:', err);
      setPhotosError(err.message || 'Failed to load photos. Please try again.');
    } finally {
      setPhotosLoading(false);
    }
  }, [debouncedSearch, photoOffset]);

  // 4. Load Users
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-action', {
        body: {
          action: 'list_users',
          limit: userLimit,
          offset: userOffset,
        },
      });
      if (error) throw error;

      const userList = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setUsers(userList);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setUsersError(err.message || 'Failed to load users list. Please try again.');
    } finally {
      setUsersLoading(false);
    }
  }, [userOffset]);

  // Trigger loads when active tab changes
  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'photos') {
      loadPhotos();
    } else if (activeTab === 'users') {
      loadUsers();
    }
  }, [isAuthorized, activeTab, loadReports, loadPhotos, loadUsers]);

  // Handle Report Actions
  const handleTogglePhotoActive = async (photoId: string | number, currentActive: boolean) => {
    const key = `toggle-${photoId}`;
    setReportActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const { error } = await supabase.functions.invoke('admin-action', {
        body: {
          action: 'toggle_photo_active',
          photo_id: photoId,
          is_active: !currentActive,
        },
      });
      if (error) throw error;
      await Promise.all([loadReports(), refreshStats()]);
    } catch (err: any) {
      alert(`Action failed: ${err.message || 'Unknown error'}`);
    } finally {
      setReportActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleDismissReport = async (reportId: string | number) => {
    const key = `dismiss-${reportId}`;
    setReportActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const { error } = await supabase.functions.invoke('admin-action', {
        body: {
          action: 'resolve_report',
          report_id: reportId,
        },
      });
      if (error) throw error;
      await Promise.all([loadReports(), refreshStats()]);
    } catch (err: any) {
      alert(`Dismiss failed: ${err.message || 'Unknown error'}`);
    } finally {
      setReportActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // If still checking authorization, render a neutral blank screen
  if (isAuthorized === null) {
    return <div className="min-h-screen bg-[#0c0a09]" />;
  }

  // Safe Stats extraction
  const totalPhotos = stats?.total_photos ?? stats?.photos_total ?? stats?.totalPhotos ?? 0;
  const activePhotos = stats?.active_photos ?? stats?.photos_active ?? stats?.activePhotos ?? 0;
  const totalUsers = stats?.total_users ?? stats?.users_total ?? stats?.totalUsers ?? 0;
  const realUsers = stats?.real_users ?? stats?.non_guest_users ?? stats?.registered_users ?? stats?.realUsers ?? 0;
  const gamesToday = stats?.games_today ?? stats?.today_games ?? stats?.gamesToday ?? 0;
  const gamesTotal = stats?.games_total ?? stats?.total_games ?? stats?.gamesTotal ?? 0;
  const openReports = stats?.open_reports ?? stats?.pending_reports ?? stats?.reports_open ?? stats?.openReports ?? 0;

  return (
    <div className="min-h-screen bg-[#100e0d] text-stone-200 font-sans p-4 sm:p-6 space-y-6 w-full max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-100 flex items-center gap-2">
              <span>Admin Management</span>
              <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                Staff Only
              </span>
            </h1>
            <p className="text-xs text-stone-400">Manage archival images, user reports, and system users</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshStats}
            disabled={isStatsLoading}
            className="py-2 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-semibold text-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isStatsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="py-2 px-3 rounded-lg bg-stone-900 hover:bg-stone-850 border border-stone-700 text-xs font-semibold text-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit to App</span>
          </button>
        </div>
      </div>

      {/* 1. Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-stone-400 tracking-wider">Total Photos</div>
          <div className="text-xl font-bold font-mono text-stone-100 mt-1">{totalPhotos.toLocaleString()}</div>
        </div>

        <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-stone-400 tracking-wider">Active Photos</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{activePhotos.toLocaleString()}</div>
        </div>

        <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-stone-400 tracking-wider">Total Users</div>
          <div className="text-xl font-bold font-mono text-stone-100 mt-1">{totalUsers.toLocaleString()}</div>
        </div>

        <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-stone-400 tracking-wider">Real (Non-Guest)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{realUsers.toLocaleString()}</div>
        </div>

        <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-stone-400 tracking-wider">Games Today</div>
          <div className="text-xl font-bold font-mono text-stone-100 mt-1">{gamesToday.toLocaleString()}</div>
        </div>

        <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-stone-400 tracking-wider">Games Total</div>
          <div className="text-xl font-bold font-mono text-stone-100 mt-1">{gamesTotal.toLocaleString()}</div>
        </div>

        <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-mono text-stone-400 tracking-wider">Open Reports</div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              openReports > 0 ? 'text-rose-400' : 'text-stone-300'
            }`}
          >
            {openReports.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800'
          }`}
        >
          <span>Reports</span>
          {openReports > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                activeTab === 'reports' ? 'bg-stone-950 text-amber-400' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {openReports}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'photos'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800'
          }`}
        >
          Photos
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800'
          }`}
        >
          Users
        </button>
      </div>

      {/* 2. Reports Tab Content */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-200">User Issue Reports</h2>
            <button
              type="button"
              onClick={loadReports}
              disabled={reportsLoading}
              className="py-1 px-2.5 rounded bg-stone-900 hover:bg-stone-850 border border-stone-700 text-stone-300 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className={`w-3 h-3 ${reportsLoading ? 'animate-spin' : ''}`} />
              <span>Reload Reports</span>
            </button>
          </div>

          {reportsError && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-center justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{reportsError}</span>
              </div>
              <button
                type="button"
                onClick={loadReports}
                className="py-1 px-2.5 rounded bg-rose-900 hover:bg-rose-850 text-rose-100 font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {reportsLoading && reports.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">Loading reports list...</div>
          ) : reports.length === 0 && !reportsError ? (
            <div className="p-8 text-center bg-stone-950 border border-stone-800 rounded-lg space-y-1">
              <p className="text-sm font-semibold text-stone-300">No open reports</p>
              <p className="text-xs text-stone-500">All photo reports have been resolved or dismissed.</p>
            </div>
          ) : (
            <div className="border border-stone-800 rounded-lg overflow-x-auto bg-stone-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-900/60 text-[11px] font-mono uppercase text-stone-400">
                    <th className="p-3">Photo</th>
                    <th className="p-3">Year &amp; Caption</th>
                    <th className="p-3">Report Reason</th>
                    <th className="p-3 text-center">Photo Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-850 text-xs">
                  {reports.map((report) => {
                    const reportId = report.report_id ?? report.id;
                    const photoId = report.photo_id ?? report.photo?.id;
                    const reason = report.reason ?? report.report_reason ?? 'No reason provided';
                    const imageUrl = report.image_url ?? report.photo?.image_url ?? report.photo?.url ?? report.url;
                    const year = report.year ?? report.true_year ?? report.photo?.true_year ?? report.photo?.year ?? '—';
                    const caption = report.caption ?? report.photo?.caption ?? 'Untitled';
                    const isActive = report.is_active ?? report.photo?.is_active ?? true;

                    const isToggleLoading = reportActionLoading[`toggle-${photoId}`];
                    const isDismissLoading = reportActionLoading[`dismiss-${reportId}`];

                    return (
                      <tr key={String(reportId)} className="hover:bg-stone-900/40">
                        {/* Thumbnail */}
                        <td className="p-3 w-20">
                          {imageUrl ? (
                            <a
                              href={imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block relative group"
                            >
                              <img
                                src={imageUrl}
                                alt={caption}
                                className="w-16 h-16 object-cover rounded border border-stone-700 bg-stone-950"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
                                <ExternalLink className="w-3.5 h-3.5 text-stone-200" />
                              </div>
                            </a>
                          ) : (
                            <div className="w-16 h-16 rounded border border-stone-800 bg-stone-950 flex items-center justify-center text-[10px] text-stone-600">
                              No img
                            </div>
                          )}
                        </td>

                        {/* Year & Caption */}
                        <td className="p-3 max-w-xs space-y-1">
                          <div className="font-mono text-amber-400 font-bold">Year: {year}</div>
                          <div className="text-stone-300 font-medium line-clamp-2">{caption}</div>
                          {photoId && (
                            <div className="text-[10px] text-stone-500 font-mono">Photo ID: {String(photoId)}</div>
                          )}
                        </td>

                        {/* Reason */}
                        <td className="p-3 max-w-sm">
                          <div className="bg-stone-900/80 border border-stone-800 rounded p-2.5 text-stone-200 text-xs">
                            <span className="font-semibold text-rose-300 block mb-0.5">Reported issue:</span>
                            {reason}
                          </div>
                          {report.created_at && (
                            <div className="text-[10px] text-stone-500 mt-1 font-mono">
                              Reported: {new Date(report.created_at).toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center w-28">
                          <span
                            className={`inline-block px-2.5 py-1 rounded text-[11px] font-semibold border ${
                              isActive
                                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                                : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="p-3 text-right space-y-1.5 w-44">
                          {photoId && (
                            <button
                              type="button"
                              disabled={isToggleLoading}
                              onClick={() => handleTogglePhotoActive(photoId, isActive)}
                              className={`w-full py-1.5 px-2.5 rounded text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                                isActive
                                  ? 'bg-stone-900 hover:bg-stone-850 text-amber-400 border-amber-900/60'
                                  : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                              }`}
                            >
                              {isToggleLoading ? 'Updating...' : isActive ? 'Deactivate photo' : 'Activate photo'}
                            </button>
                          )}

                          {reportId && (
                            <button
                              type="button"
                              disabled={isDismissLoading}
                              onClick={() => handleDismissReport(reportId)}
                              className="w-full py-1.5 px-2.5 rounded text-xs font-semibold bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-700/80 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isDismissLoading ? 'Dismissing...' : 'Dismiss report'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Photos Tab Content */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={photoSearchQuery}
                onChange={(e) => setPhotoSearchQuery(e.target.value)}
                placeholder="Search photos by caption, year, or category..."
                className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-4 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={photoOffset === 0 || photosLoading}
                onClick={() => setPhotoOffset((prev) => Math.max(0, prev - photoLimit))}
                className="py-1.5 px-3 rounded bg-stone-900 hover:bg-stone-850 border border-stone-700 text-xs font-semibold text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="text-xs font-mono text-stone-400 px-2">
                Page {Math.floor(photoOffset / photoLimit) + 1}
              </span>

              <button
                type="button"
                disabled={photos.length < photoLimit || photosLoading}
                onClick={() => setPhotoOffset((prev) => prev + photoLimit)}
                className="py-1.5 px-3 rounded bg-stone-900 hover:bg-stone-850 border border-stone-700 text-xs font-semibold text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={loadPhotos}
                disabled={photosLoading}
                className="py-1.5 px-2.5 rounded bg-stone-900 hover:bg-stone-850 border border-stone-700 text-stone-300 text-xs cursor-pointer ml-1"
                title="Reload current page"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${photosLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {photosError && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-center justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{photosError}</span>
              </div>
              <button
                type="button"
                onClick={loadPhotos}
                className="py-1 px-2.5 rounded bg-rose-900 hover:bg-rose-850 text-rose-100 font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {photosLoading && photos.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">Loading photos...</div>
          ) : photos.length === 0 && !photosError ? (
            <div className="p-8 text-center bg-stone-950 border border-stone-800 rounded-lg space-y-1">
              <p className="text-sm font-semibold text-stone-300">No photos found</p>
              <p className="text-xs text-stone-500">
                {photoSearchQuery ? 'Try adjusting your search query' : 'No records returned from database.'}
              </p>
            </div>
          ) : (
            <div className="border border-stone-800 rounded-lg overflow-x-auto bg-stone-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-900/60 text-[11px] font-mono uppercase text-stone-400">
                    <th className="p-3">Photo</th>
                    <th className="p-3">Year</th>
                    <th className="p-3">Caption &amp; Fun Fact</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-850">
                  {photos.map((photo) => (
                    <PhotoRowEditor
                      key={String(photo.photo_id ?? photo.id)}
                      photo={photo}
                      onRefresh={refreshStats}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Users Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-200">Registered &amp; Guest Accounts</h2>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={userOffset === 0 || usersLoading}
                onClick={() => setUserOffset((prev) => Math.max(0, prev - userLimit))}
                className="py-1.5 px-3 rounded bg-stone-900 hover:bg-stone-850 border border-stone-700 text-xs font-semibold text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="text-xs font-mono text-stone-400 px-2">
                Page {Math.floor(userOffset / userLimit) + 1}
              </span>

              <button
                type="button"
                disabled={users.length < userLimit || usersLoading}
                onClick={() => setUserOffset((prev) => prev + userLimit)}
                className="py-1.5 px-3 rounded bg-stone-900 hover:bg-stone-850 border border-stone-700 text-xs font-semibold text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={loadUsers}
                disabled={usersLoading}
                className="py-1.5 px-2.5 rounded bg-stone-900 hover:bg-stone-850 border border-stone-700 text-stone-300 text-xs cursor-pointer ml-1"
                title="Reload users"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {usersError && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-center justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{usersError}</span>
              </div>
              <button
                type="button"
                onClick={loadUsers}
                className="py-1 px-2.5 rounded bg-rose-900 hover:bg-rose-850 text-rose-100 font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {usersLoading && users.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">Loading users...</div>
          ) : users.length === 0 && !usersError ? (
            <div className="p-8 text-center bg-stone-950 border border-stone-800 rounded-lg space-y-1">
              <p className="text-sm font-semibold text-stone-300">No users found</p>
              <p className="text-xs text-stone-500">No user records returned from server.</p>
            </div>
          ) : (
            <div className="border border-stone-800 rounded-lg overflow-x-auto bg-stone-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-900/60 text-[11px] font-mono uppercase text-stone-400">
                    <th className="p-3">Email / User</th>
                    <th className="p-3">Account Type</th>
                    <th className="p-3">Joined Date</th>
                    <th className="p-3">Last Sign-In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-850 text-xs">
                  {users.map((user, idx) => {
                    const isGuest =
                      user.is_anonymous === true ||
                      user.is_guest === true ||
                      (!user.email && user.display_name?.startsWith('Player'));

                    return (
                      <tr key={user.id || idx} className="hover:bg-stone-900/40">
                        {/* Email / User */}
                        <td className="p-3">
                          <div className="font-semibold text-stone-200">
                            {user.email || (
                              <span className="text-stone-500 italic">No email (Anonymous)</span>
                            )}
                          </div>
                          {user.display_name && (
                            <div className="text-[11px] text-amber-400/90 font-mono">
                              Name: {user.display_name}
                            </div>
                          )}
                          {user.id && (
                            <div className="text-[10px] text-stone-500 font-mono">
                              UID: {String(user.id).slice(0, 10)}…
                            </div>
                          )}
                        </td>

                        {/* Account Type */}
                        <td className="p-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                              isGuest
                                ? 'bg-stone-900 border-stone-750 text-stone-400'
                                : 'bg-amber-950/60 border-amber-800/80 text-amber-300'
                            }`}
                          >
                            {isGuest ? 'Guest' : 'Real account'}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="p-3 text-stone-400 font-mono text-[11px]">
                          {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                        </td>

                        {/* Last Sign-in */}
                        <td className="p-3 text-stone-400 font-mono text-[11px]">
                          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default AdminPage;
