import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, imageUrl, parseSupabaseError } from '../lib/supabase.ts';
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
  Upload,
  Ban,
  UserCheck,
  CheckSquare,
  Square,
  BarChart3,
  Users,
  Image as ImageIcon,
  Flag,
  X,
  Lock,
  LogOut,
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
  country_code?: string | null;
  is_banned?: boolean;
  ban_reason?: string | null;
  [key: string]: any;
}

interface PhotoInsightsData {
  never_played_count?: number;
  unplayed_photos?: number;
  most_reported?: Array<{
    photo_id?: string | number;
    id?: string | number;
    image_path?: string;
    image_url?: string;
    url?: string;
    caption?: string;
    true_year?: number;
    year?: number;
    report_count?: number;
    reports_count?: number;
    count?: number;
    is_active?: boolean;
  }>;
  [key: string]: any;
}

// -------------------------------------------------------------
// PhotoRowEditor: Editable photo table row with multi-select
// -------------------------------------------------------------
const PhotoRowEditor: React.FC<{
  photo: PhotoItem;
  isSelected: boolean;
  onToggleSelect: (id: string | number) => void;
  onRefresh: () => void;
}> = ({ photo, isSelected, onToggleSelect, onRefresh }) => {
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

      const { error: updateError } = await supabase.functions.invoke('admin-action', {
        body,
      });

      if (updateError) {
        const parsedMsg = await parseSupabaseError(updateError);
        throw new Error(parsedMsg);
      }

      // If active state changed, also ensure toggle_photo_active is recorded if needed
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

  // Build actual image preview URL using the central helper
  const rawPath = photo.image_path || photo.image_url || photo.url;
  const thumbSrc = imageUrl(rawPath);

  return (
    <tr className={`border-b border-stone-800 hover:bg-stone-900/40 text-xs transition-colors ${isSelected ? 'bg-amber-950/20' : ''}`}>
      {/* Checkbox */}
      <td className="p-3 align-top w-10 text-center">
        {photoId && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(photoId)}
            className="w-4 h-4 rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer accent-amber-500"
            title="Select for bulk action"
          />
        )}
      </td>

      {/* Thumbnail */}
      <td className="p-3 align-top w-20">
        {thumbSrc ? (
          <a
            href={thumbSrc}
            target="_blank"
            rel="noopener noreferrer"
            title="Open full image"
            className="block relative group"
          >
            <img
              src={thumbSrc}
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

// -------------------------------------------------------------
// Main AdminPage Component
// -------------------------------------------------------------
export const AdminPage: React.FC = () => {
  const navigate = useNavigate();

  // Access validation: verified by calling supabase.rpc('admin_stats')
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // Admin sign-in form state (shown when isAuthorized === false)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Tab: reports, photos, upload, users, insights
  const [activeTab, setActiveTab] = useState<'reports' | 'photos' | 'upload' | 'users' | 'insights'>('reports');

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
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string | number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userOffset, setUserOffset] = useState(0);
  const userLimit = 50;

  // Ban Modal state
  const [banTargetUser, setBanTargetUser] = useState<UserItem | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState<Record<string, boolean>>({});

  // Upload Form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadYear, setUploadYear] = useState('');
  const [uploadTakenOn, setUploadTakenOn] = useState('');
  const [uploadLat, setUploadLat] = useState('');
  const [uploadLng, setUploadLng] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadFunFact, setUploadFunFact] = useState('');
  const [uploadCredit, setUploadCredit] = useState('');
  const [uploadLicense, setUploadLicense] = useState('Public domain');
  const [uploadSourceUrl, setUploadSourceUrl] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Insights state
  const [insights, setInsights] = useState<PhotoInsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightActionLoading, setInsightActionLoading] = useState<Record<string, boolean>>({});

  // Checks whether the current Supabase session belongs to an admin.
  // Used both on initial load and right after a sign-in attempt.
  // Returns true/false (never throws) so callers can react to the result.
  const checkAdminAccess = useCallback(async (): Promise<boolean> => {
    try {
      const [{ data: statsData, error: statsError }, { data: authData }] = await Promise.all([
        supabase.rpc('admin_stats'),
        supabase.auth.getUser(),
      ]);

      const statObj = Array.isArray(statsData) ? statsData[0] : statsData;

      if (statsError || !statObj || typeof statObj !== 'object') {
        setIsAuthorized(false);
        setCurrentUserId(authData?.user?.id ?? null);
        return false;
      }

      setStats(statObj);
      setCurrentUserId(authData?.user?.id ?? null);
      setIsAuthorized(true);
      return true;
    } catch {
      setIsAuthorized(false);
      return false;
    }
  }, []);

  // 1. Initial auth check on mount
  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  // 2. Admin sign-in form submit
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setAuthError('Please enter your email.');
      return;
    }
    if (!loginPassword) {
      setAuthError('Please enter your password.');
      return;
    }

    setLoginSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: loginPassword,
      });
      if (signInError) throw signInError;

      const authorized = await checkAdminAccess();
      if (!authorized) {
        // Signed in fine, but this account isn't in the admins table.
        // Sign back out so a random player's own account doesn't sit
        // "logged in" on the admin screen.
        await supabase.auth.signOut();
        setIsAuthorized(false);
        setAuthError('That account is signed in, but it does not have admin access.');
      } else {
        setLoginPassword('');
      }
    } catch (err: any) {
      const parsedMsg = await parseSupabaseError(err);
      setAuthError(parsedMsg || err.message || 'Sign-in failed. Check your email and password.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  // 3. Admin sign-out
  const handleAdminSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthorized(false);
    setCurrentUserId(null);
    setStats(null);
    setLoginEmail('');
    setLoginPassword('');
  };

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
      setPhotoOffset(0);
      setSelectedPhotoIds(new Set());
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
      if (error) {
        const parsedMsg = await parseSupabaseError(error);
        throw new Error(parsedMsg);
      }

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

  // 5. Load Insights
  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const { data, error } = await supabase.rpc('admin_photo_insights');
      if (error) throw error;

      let parsedInsights: PhotoInsightsData = {};
      if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
          // If returned as an array, check if first item is stat summary or list of photos
          if (data.length > 0 && ('never_played_count' in data[0] || 'unplayed_photos' in data[0])) {
            parsedInsights = data[0];
          } else {
            parsedInsights = { most_reported: data };
          }
        } else {
          parsedInsights = data;
        }
      }
      setInsights(parsedInsights);
    } catch (err: any) {
      console.error('Failed to load photo insights:', err);
      setInsightsError(err.message || 'Failed to load insights. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  // Trigger loads when active tab changes
  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'photos') {
      loadPhotos();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'insights') {
      loadInsights();
    }
  }, [isAuthorized, activeTab, loadReports, loadPhotos, loadUsers, loadInsights]);

  // -------------------------------------------------------------
  // Reports Actions
  // -------------------------------------------------------------
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
      if (error) {
        const parsedMsg = await parseSupabaseError(error);
        throw new Error(parsedMsg);
      }
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
      if (error) {
        const parsedMsg = await parseSupabaseError(error);
        throw new Error(parsedMsg);
      }
      await Promise.all([loadReports(), refreshStats()]);
    } catch (err: any) {
      alert(`Dismiss failed: ${err.message || 'Unknown error'}`);
    } finally {
      setReportActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // -------------------------------------------------------------
  // Bulk Photos Actions
  // -------------------------------------------------------------
  const toggleSelectPhoto = (id: string | number) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    const pageIds = photos.map((p) => p.photo_id ?? p.id).filter(Boolean) as (string | number)[];
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedPhotoIds.has(id));

    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkTogglePhotos = async (isActive: boolean) => {
    if (selectedPhotoIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-action', {
        body: {
          action: 'bulk_toggle_photos',
          photo_ids: Array.from(selectedPhotoIds),
          is_active: isActive,
        },
      });
      if (error) {
        const parsedMsg = await parseSupabaseError(error);
        throw new Error(parsedMsg);
      }
      setSelectedPhotoIds(new Set());
      await Promise.all([loadPhotos(), refreshStats()]);
    } catch (err: any) {
      alert(`Bulk action failed: ${err.message || 'Unknown error'}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Users Actions: Ban & Unban
  // -------------------------------------------------------------
  const handleOpenBanModal = (user: UserItem) => {
    setBanTargetUser(user);
    setBanReasonInput('');
  };

  const handleConfirmBan = async () => {
    if (!banTargetUser?.id) return;
    setBanSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('admin-action', {
        body: {
          action: 'ban_user',
          user_id: banTargetUser.id,
          reason: banReasonInput.trim() || undefined,
        },
      });
      if (error) {
        const parsedMsg = await parseSupabaseError(error);
        throw new Error(parsedMsg);
      }
      setBanTargetUser(null);
      await Promise.all([loadUsers(), refreshStats()]);
    } catch (err: any) {
      alert(`Ban failed: ${err.message || 'Unknown error'}`);
    } finally {
      setBanSubmitting(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setUserActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const { error } = await supabase.functions.invoke('admin-action', {
        body: {
          action: 'unban_user',
          user_id: userId,
        },
      });
      if (error) {
        const parsedMsg = await parseSupabaseError(error);
        throw new Error(parsedMsg);
      }
      await Promise.all([loadUsers(), refreshStats()]);
    } catch (err: any) {
      alert(`Unban failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUserActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // -------------------------------------------------------------
  // Upload Photo Action
  // -------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setUploadFile(null);
      setUploadPreview(null);
      return;
    }
    setUploadFile(file);
    const objectUrl = URL.createObjectURL(file);
    setUploadPreview(objectUrl);
  };

  // Resize client-side to max 1600px and convert to WebP base64
  const processImageFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve((event.target?.result as string) || '');
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', 0.88);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image for processing'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadErrorMsg(null);
    setUploadSuccessMsg(null);

    if (!uploadFile) {
      setUploadErrorMsg('Please select an image file to upload.');
      return;
    }

    const parsedYear = Number(uploadYear);
    if (!uploadYear.trim() || isNaN(parsedYear) || parsedYear < 1800 || parsedYear > 2030) {
      setUploadErrorMsg('Please enter a valid photo year (e.g. 1952).');
      return;
    }

    // Exact date validation: if provided, year must match
    if (uploadTakenOn) {
      const dateYear = parseInt(uploadTakenOn.split('-')[0], 10);
      if (dateYear !== parsedYear) {
        setUploadErrorMsg(`Exact date year (${dateYear}) must match the entered Year (${parsedYear}).`);
        return;
      }
    }

    // Latitude & Longitude validation: both or neither
    const hasLat = uploadLat.trim() !== '';
    const hasLng = uploadLng.trim() !== '';
    if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
      setUploadErrorMsg('Latitude and Longitude must both be provided, or both left blank.');
      return;
    }

    if (hasLat && hasLng) {
      const latNum = Number(uploadLat);
      const lngNum = Number(uploadLng);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        setUploadErrorMsg('Latitude must be a valid coordinate between -90 and 90.');
        return;
      }
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        setUploadErrorMsg('Longitude must be a valid coordinate between -180 and 180.');
        return;
      }
    }

    if (!uploadCredit.trim()) {
      setUploadErrorMsg('Photo Credit is required.');
      return;
    }

    if (!uploadLicense.trim()) {
      setUploadErrorMsg('Photo License is required.');
      return;
    }

    setUploadSubmitting(true);

    try {
      // Process image to webp base64 max 1600px
      const base64Data = await processImageFile(uploadFile);

      const body: Record<string, any> = {
        action: 'upload_photo',
        image_base64: base64Data,
        true_year: parsedYear,
        credit: uploadCredit.trim(),
        license: uploadLicense.trim(),
      };

      if (uploadTakenOn) body.taken_on = uploadTakenOn;
      if (hasLat && hasLng) {
        body.lat = Number(uploadLat);
        body.lng = Number(uploadLng);
      }
      if (uploadCaption.trim()) body.caption = uploadCaption.trim();
      if (uploadFunFact.trim()) body.fun_fact = uploadFunFact.trim();
      if (uploadSourceUrl.trim()) body.source_url = uploadSourceUrl.trim();
      if (uploadCategory.trim()) body.category = uploadCategory.trim();

      const { data, error } = await supabase.functions.invoke('admin-action', { body });

      if (error) {
        let errCode = 'upload_failed';
        try {
          if (error.context && typeof error.context.json === 'function') {
            const errJson = await error.context.json();
            errCode = errJson.error || errJson.message || errCode;
          }
        } catch {
          // ignore
        }
        throw new Error(errCode);
      }

      const newId = data?.photo_id || data?.id || data?.photo?.id || 'Created';
      setUploadSuccessMsg(`Photo uploaded successfully! Photo ID: ${newId}`);

      // Reset form
      setUploadFile(null);
      setUploadPreview(null);
      setUploadYear('');
      setUploadTakenOn('');
      setUploadLat('');
      setUploadLng('');
      setUploadCaption('');
      setUploadFunFact('');
      setUploadCredit('');
      setUploadLicense('Public domain');
      setUploadSourceUrl('');
      setUploadCategory('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await refreshStats();
    } catch (err: any) {
      console.error('Failed to upload photo:', err);
      setUploadErrorMsg(err.message || 'Failed to upload photo. Please check parameters and try again.');
    } finally {
      setUploadSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Insights Actions: Quick Toggle Active
  // -------------------------------------------------------------
  const handleToggleInsightPhoto = async (photoId: string | number, currentActive: boolean) => {
    const key = `insight-${photoId}`;
    setInsightActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const { error } = await supabase.functions.invoke('admin-action', {
        body: {
          action: 'toggle_photo_active',
          photo_id: photoId,
          is_active: !currentActive,
        },
      });
      if (error) {
        const parsedMsg = await parseSupabaseError(error);
        throw new Error(parsedMsg);
      }
      await Promise.all([loadInsights(), refreshStats()]);
    } catch (err: any) {
      alert(`Toggle failed: ${err.message || 'Unknown error'}`);
    } finally {
      setInsightActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // If still checking authorization, render a neutral blank screen
  if (isAuthorized === null) {
    return <div className="min-h-screen bg-[#0c0a09]" />;
  }

  // Not signed in as an admin: show a dedicated sign-in form instead of
  // silently bouncing back to the game (the real gate is still server-side —
  // this just gives staff a proper way in, and a clear reason when it fails).
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-stone-200 font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-stone-100">Admin Sign-In</h1>
            <p className="text-sm text-stone-500 text-center">
              Sign in with an admin account to manage When &amp; Where.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2.5 pr-10 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 cursor-pointer"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="flex items-start gap-2 text-sm text-rose-300 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-semibold rounded-lg py-2.5 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {loginSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full mt-4 text-sm text-stone-500 hover:text-stone-300 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to the game
          </button>
        </div>
      </div>
    );
  }

  // Safe Stats extraction
  const totalPhotos = stats?.total_photos ?? stats?.photos_total ?? stats?.totalPhotos ?? 0;
  const activePhotos = stats?.active_photos ?? stats?.photos_active ?? stats?.activePhotos ?? 0;
  const totalUsers = stats?.total_users ?? stats?.users_total ?? stats?.totalUsers ?? 0;
  const realUsers = stats?.real_users ?? stats?.non_guest_users ?? stats?.registered_users ?? stats?.realUsers ?? 0;
  const gamesToday = stats?.games_today ?? stats?.today_games ?? stats?.gamesToday ?? 0;
  const gamesTotal = stats?.games_total ?? stats?.total_games ?? stats?.gamesTotal ?? 0;
  const openReports = stats?.open_reports ?? stats?.pending_reports ?? stats?.reports_open ?? stats?.openReports ?? 0;

  const pageIds = photos.map((p) => p.photo_id ?? p.id).filter(Boolean) as (string | number)[];
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedPhotoIds.has(id));

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

          <button
            type="button"
            onClick={handleAdminSignOut}
            className="py-2 px-3 rounded-lg bg-stone-900 hover:bg-rose-950 border border-stone-700 hover:border-rose-900 text-xs font-semibold text-stone-300 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sign out of this admin account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
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
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
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
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'photos'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Photos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('insights')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'insights'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Insights</span>
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
              <RotateCcw className={`w-3.5 h-3.5 ${reportsLoading ? 'animate-spin' : ''}`} />
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
                    const rawReportPath =
                      report.image_path ||
                      report.photo?.image_path ||
                      report.image_url ||
                      report.photo?.image_url ||
                      report.url;
                    const thumbSrc = imageUrl(rawReportPath);
                    const year = report.year ?? report.true_year ?? report.photo?.true_year ?? report.photo?.year ?? '—';
                    const caption = report.caption ?? report.photo?.caption ?? 'Untitled';
                    const isActive = report.is_active ?? report.photo?.is_active ?? true;

                    const isToggleLoading = reportActionLoading[`toggle-${photoId}`];
                    const isDismissLoading = reportActionLoading[`dismiss-${reportId}`];

                    return (
                      <tr key={String(reportId)} className="hover:bg-stone-900/40">
                        {/* Thumbnail */}
                        <td className="p-3 w-20">
                          {thumbSrc ? (
                            <a
                              href={thumbSrc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block relative group"
                            >
                              <img
                                src={thumbSrc}
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
          {/* Multi-Select Action Bar (appears when 1+ selected) */}
          {selectedPhotoIds.size > 0 && (
            <div className="sticky top-4 z-30 p-3 bg-amber-950/90 border border-amber-600/80 rounded-lg shadow-xl shadow-black/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-100 animate-fade-in">
              <div className="flex items-center gap-2 font-semibold">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <span>
                  {selectedPhotoIds.size} photo{selectedPhotoIds.size > 1 ? 's' : ''} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkTogglePhotos(true)}
                  className="py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold border border-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Activate selected</span>
                </button>

                <button
                  type="button"
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkTogglePhotos(false)}
                  className="py-1.5 px-3 rounded bg-rose-600 hover:bg-rose-500 text-stone-950 font-bold border border-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Deactivate selected</span>
                </button>

                <button
                  type="button"
                  disabled={bulkActionLoading}
                  onClick={() => setSelectedPhotoIds(new Set())}
                  className="py-1.5 px-2.5 rounded bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-700 font-semibold cursor-pointer"
                >
                  Deselect all
                </button>
              </div>
            </div>
          )}

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
                    <th className="p-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllPage}
                        title={allPageSelected ? 'Deselect all on page' : 'Select all on page'}
                        className="text-stone-400 hover:text-stone-200 cursor-pointer"
                      >
                        {allPageSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-500 inline" />
                        ) : (
                          <Square className="w-4 h-4 inline" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">Photo</th>
                    <th className="p-3">Year</th>
                    <th className="p-3">Caption &amp; Fun Fact</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-850">
                  {photos.map((photo) => {
                    const id = photo.photo_id ?? photo.id;
                    const isSelected = Boolean(id && selectedPhotoIds.has(id));
                    return (
                      <PhotoRowEditor
                        key={String(id)}
                        photo={photo}
                        isSelected={isSelected}
                        onToggleSelect={toggleSelectPhoto}
                        onRefresh={refreshStats}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Upload Tab Content */}
      {activeTab === 'upload' && (
        <div className="space-y-6 max-w-3xl bg-stone-950 border border-stone-800 rounded-lg p-5 sm:p-6">
          <div>
            <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Upload Archival Photo</span>
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Add new historical photographs to the game database. Images are automatically resized client-side to max 1600px and converted to WebP before upload.
            </p>
          </div>

          {uploadSuccessMsg && (
            <div className="p-4 bg-emerald-950/50 border border-emerald-700/80 rounded-lg flex items-center gap-2 text-xs text-emerald-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccessMsg}</span>
            </div>
          )}

          {uploadErrorMsg && (
            <div className="p-4 bg-rose-950/50 border border-rose-700/80 rounded-lg flex items-center gap-2 text-xs text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* Image File Picker & Preview */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-300">
                Photo Image File <span className="text-rose-400">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
                className="block w-full text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-stone-950 hover:file:bg-amber-500 cursor-pointer border border-stone-800 rounded p-1 bg-stone-900"
              />
              {uploadPreview && (
                <div className="mt-3 flex items-center gap-4 p-3 bg-stone-900/60 border border-stone-800 rounded">
                  <img
                    src={uploadPreview}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded border border-stone-700 bg-stone-950"
                  />
                  <div className="text-xs text-stone-400 space-y-1">
                    <p className="font-semibold text-stone-200">{uploadFile?.name}</p>
                    <p className="font-mono text-[11px]">
                      {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : ''}
                    </p>
                    <p className="text-[11px] text-amber-400/90">Will be converted to WebP (max 1600px)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Year & Exact Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  True Year <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1800"
                  max="2030"
                  value={uploadYear}
                  onChange={(e) => setUploadYear(e.target.value)}
                  placeholder="e.g. 1969"
                  className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Exact Date (<span className="font-normal text-stone-400">optional, must match year</span>)
                </label>
                <input
                  type="date"
                  value={uploadTakenOn}
                  onChange={(e) => setUploadTakenOn(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Latitude & Longitude */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Latitude (<span className="font-normal text-stone-400">optional, both or neither</span>)
                </label>
                <input
                  type="number"
                  step="any"
                  value={uploadLat}
                  onChange={(e) => setUploadLat(e.target.value)}
                  placeholder="e.g. 28.5728"
                  className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Longitude (<span className="font-normal text-stone-400">optional, both or neither</span>)
                </label>
                <input
                  type="number"
                  step="any"
                  value={uploadLng}
                  onChange={(e) => setUploadLng(e.target.value)}
                  placeholder="e.g. -80.6490"
                  className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Photo Caption / Title</label>
              <input
                type="text"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="e.g. Apollo 11 Saturn V roll out at Kennedy Space Center"
                className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Fun Fact */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Fun Fact / Historical Context</label>
              <textarea
                rows={2}
                value={uploadFunFact}
                onChange={(e) => setUploadFunFact(e.target.value)}
                placeholder="Revealed to players on the round results screen..."
                className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Credit & License */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Credit <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uploadCredit}
                  onChange={(e) => setUploadCredit(e.target.value)}
                  placeholder="e.g. NASA / Neil Armstrong"
                  className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  License <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={uploadLicense}
                  onChange={(e) => setUploadLicense(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Public domain">Public domain</option>
                  <option value="CC0">CC0 (No Rights Reserved)</option>
                  <option value="CC BY">CC BY (Attribution)</option>
                  <option value="CC BY-SA">CC BY-SA (ShareAlike)</option>
                  <option value="CC BY-NC">CC BY-NC (NonCommercial)</option>
                  <option value="Fair use">Fair use / Archival</option>
                </select>
              </div>
            </div>

            {/* Source URL & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Source URL</label>
                <input
                  type="url"
                  value={uploadSourceUrl}
                  onChange={(e) => setUploadSourceUrl(e.target.value)}
                  placeholder="https://commons.wikimedia.org/..."
                  className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Category</label>
                <input
                  type="text"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  placeholder="e.g. daily, aviation, general"
                  className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={uploadSubmitting}
                className="py-2.5 px-6 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {uploadSubmitting ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Processing &amp; Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload Photo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Users Tab Content */}
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
                    <th className="p-3">Country</th>
                    <th className="p-3">Account Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Joined Date</th>
                    <th className="p-3">Last Sign-In</th>
                    <th className="p-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-850 text-xs">
                  {users.map((user, idx) => {
                    const isGuest =
                      user.is_anonymous === true ||
                      user.is_guest === true ||
                      (!user.email && user.display_name?.startsWith('Player'));
                    const isSelf = Boolean(currentUserId && user.id === currentUserId);
                    const isBanned = Boolean(user.is_banned);
                    const banReason = user.ban_reason;
                    const isActionBusy = user.id ? userActionLoading[user.id] : false;

                    return (
                      <tr key={user.id || idx} className="hover:bg-stone-900/40">
                        {/* Email / User */}
                        <td className="p-3">
                          <div className="font-semibold text-stone-200 flex items-center gap-1.5">
                            <span>{user.email || <span className="text-stone-500 italic">No email (Anonymous)</span>}</span>
                            {isSelf && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                You
                              </span>
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

                        {/* Country */}
                        <td className="p-3 font-mono text-[11px] text-stone-300">
                          {user.country_code ? (
                            <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800">
                              {user.country_code.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-stone-600">—</span>
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

                        {/* Status (Active / Banned with reason) */}
                        <td className="p-3">
                          {isBanned ? (
                            <div className="space-y-0.5">
                              <span
                                className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950/80 border border-rose-800 text-rose-300 cursor-help"
                                title={banReason ? `Ban Reason: ${banReason}` : 'Account is banned'}
                              >
                                Banned
                              </span>
                              {banReason && (
                                <p className="text-[10px] text-rose-400 truncate max-w-[140px]" title={banReason}>
                                  {banReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/50 border border-emerald-900 text-emerald-400">
                              Active
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="p-3 text-stone-400 font-mono text-[11px]">
                          {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                        </td>

                        {/* Last Sign-in */}
                        <td className="p-3 text-stone-400 font-mono text-[11px]">
                          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}
                        </td>

                        {/* Moderation Actions (Never show ban on self) */}
                        <td className="p-3 text-right">
                          {isSelf ? (
                            <span className="text-[11px] text-stone-500 font-mono italic">Current Admin</span>
                          ) : isBanned ? (
                            <button
                              type="button"
                              disabled={isActionBusy}
                              onClick={() => user.id && handleUnbanUser(user.id)}
                              className="py-1 px-3 rounded text-xs font-semibold bg-stone-900 hover:bg-stone-850 text-emerald-400 border border-emerald-800/80 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isActionBusy ? 'Unbanning...' : 'Unban'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isActionBusy}
                              onClick={() => handleOpenBanModal(user)}
                              className="py-1 px-3 rounded text-xs font-semibold bg-stone-900 hover:bg-stone-850 text-rose-400 border border-rose-800/80 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 ml-auto"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Ban</span>
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

      {/* 6. Insights Tab Content */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-200">Archival Photo Insights</h2>
              <p className="text-xs text-stone-400">Gameplay distribution and highly reported images</p>
            </div>
            <button
              type="button"
              onClick={loadInsights}
              disabled={insightsLoading}
              className="py-1 px-2.5 rounded bg-stone-900 hover:bg-stone-850 border border-stone-700 text-stone-300 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
              <span>Reload Insights</span>
            </button>
          </div>

          {insightsError && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-center justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{insightsError}</span>
              </div>
              <button
                type="button"
                onClick={loadInsights}
                className="py-1 px-2.5 rounded bg-rose-900 hover:bg-rose-850 text-rose-100 font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Unplayed Photos Stat Card */}
          <div className="p-4 bg-stone-950 border border-stone-800 rounded-lg max-w-sm">
            <div className="text-[10px] uppercase font-mono text-stone-400 tracking-wider">Unplayed Photos</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {(insights?.never_played_count ?? insights?.unplayed_photos ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              photos have never been played in any user session.
            </div>
          </div>

          {/* Top 10 Most-Reported Photos */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-mono uppercase text-stone-400 tracking-wider">
              Top 10 Most-Reported Photos
            </h3>

            {insightsLoading && !insights ? (
              <div className="py-8 text-center text-xs text-stone-400">Loading photo insights...</div>
            ) : !insights?.most_reported || insights.most_reported.length === 0 ? (
              <div className="p-6 text-center bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-400">
                No reported photo anomalies recorded yet.
              </div>
            ) : (
              <div className="border border-stone-800 rounded-lg overflow-x-auto bg-stone-950">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800 bg-stone-900/60 text-[11px] font-mono uppercase text-stone-400">
                      <th className="p-3">Photo</th>
                      <th className="p-3">Year &amp; Caption</th>
                      <th className="p-3 text-center">Reports Count</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850 text-xs">
                    {insights.most_reported.slice(0, 10).map((item) => {
                      const id = item.photo_id ?? item.id;
                      const rawPath = item.image_path || item.image_url || item.url;
                      const thumbSrc = imageUrl(rawPath);
                      const reportCount = item.report_count ?? item.reports_count ?? item.count ?? 0;
                      const isActive = item.is_active !== false;
                      const isBusy = id ? insightActionLoading[`insight-${id}`] : false;

                      return (
                        <tr key={String(id)} className="hover:bg-stone-900/40">
                          {/* Thumbnail */}
                          <td className="p-3 w-20">
                            {thumbSrc ? (
                              <a
                                href={thumbSrc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block relative group"
                              >
                                <img
                                  src={thumbSrc}
                                  alt={item.caption || 'Reported photo'}
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
                          <td className="p-3 max-w-md space-y-1">
                            <div className="font-mono text-amber-400 font-bold">
                              Year: {item.true_year ?? item.year ?? '—'}
                            </div>
                            <div className="text-stone-300 font-medium line-clamp-2">
                              {item.caption || 'Untitled photo'}
                            </div>
                            {id && <div className="text-[10px] text-stone-500 font-mono">ID: {String(id)}</div>}
                          </td>

                          {/* Report Count */}
                          <td className="p-3 text-center w-28">
                            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-rose-950 border border-rose-800 text-rose-300">
                              {reportCount} report{reportCount !== 1 ? 's' : ''}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-3 text-center w-28">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                isActive
                                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                                  : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Quick Deactivate / Activate */}
                          <td className="p-3 text-right w-36">
                            {id && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleInsightPhoto(id, isActive)}
                                className={`py-1.5 px-3 rounded text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                                  isActive
                                    ? 'bg-stone-900 hover:bg-stone-850 text-amber-400 border-amber-900/60'
                                    : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                                }`}
                              >
                                {isBusy ? 'Updating...' : isActive ? 'Deactivate' : 'Activate'}
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
        </div>
      )}

      {/* Ban User Confirmation Modal */}
      {banTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xl animate-modal-content">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Ban className="w-4 h-4" />
                <span>Ban User Account</span>
              </div>
              <button
                type="button"
                onClick={() => setBanTargetUser(null)}
                className="text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-300">
              Are you sure you want to ban{' '}
              <strong className="text-amber-400">
                {banTargetUser.email || banTargetUser.display_name || banTargetUser.id}
              </strong>
              ? They will be blocked from playing and accessing the platform.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300">Ban Reason (optional)</label>
              <input
                type="text"
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                placeholder="e.g. Inappropriate username, leaderboard manipulation..."
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={banSubmitting}
                onClick={() => setBanTargetUser(null)}
                className="py-1.5 px-3 rounded text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={banSubmitting}
                onClick={handleConfirmBan}
                className="py-1.5 px-4 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-stone-950 font-bold border border-rose-400 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {banSubmitting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Banning...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Confirm Ban</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
