import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  
  // -- Details State
  const [detailsForm, setDetailsForm] = useState({
    name: user?.name || '',
    department: user?.department || '',
    studentId: user?.studentId || ''
  });
  const [detailsStatus, setDetailsStatus] = useState({ type: '', msg: '' });
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);

  // -- Password State
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passStatus, setPassStatus] = useState({ type: '', msg: '' });
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // -- Avatar State
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleAvatarClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await authAPI.uploadAvatar(formData);
      if (res.data.success && updateUser) {
        updateUser(res.data.user);
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      const errMsg = error.response?.data?.message || 'Please try again.';
      alert(`Failed to upload avatar: ${errMsg}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingDetails(true);
    setDetailsStatus({ type: '', msg: '' });
    try {
      const res = await authAPI.updateProfile(detailsForm);
      if (res.data.success && updateUser) {
        updateUser(res.data.user);
        setDetailsStatus({ type: 'success', msg: 'Profile updated successfully!' });
      }
    } catch (err) {
      setDetailsStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  const handlePassSubmit = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      return setPassStatus({ type: 'error', msg: 'New passwords do not match.' });
    }
    setIsUpdatingPass(true);
    setPassStatus({ type: '', msg: '' });
    try {
      const res = await authAPI.changePassword({
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword
      });
      if (res.data.success) {
        setPassStatus({ type: 'success', msg: res.data.message });
        setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPassStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setIsUpdatingPass(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in relative z-10">
      
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-6">
        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-zoom-blue to-blue-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-zoom-blue/20">
          ⚙️
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Account Settings</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your profile, security, and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden group flex flex-col items-center text-center">
            <div className="absolute inset-0 bg-linear-to-br from-zoom-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" />
            
            <div 
              onClick={handleAvatarClick}
              className="w-32 h-32 rounded-full relative flex items-center justify-center bg-zinc-800 text-zinc-300 font-bold text-4xl border border-zinc-700/50 cursor-pointer shadow-xl hover:opacity-80 transition-opacity mb-5 mt-2" 
              title="Change Profile Picture"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                initials
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-zinc-800 border-2 border-zinc-900 rounded-full flex items-center justify-center text-sm shadow-lg text-zinc-300 hover:text-white transition-colors">
                📷
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            
            <h2 className="text-xl font-bold text-white mb-1">{user?.name}</h2>
            <p className="text-sm text-zinc-400 capitalize">{user?.role}</p>
            <div className="mt-4 px-4 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold rounded-full">
              Account Active
            </div>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Details Form Card */}
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-zoom-blue">📝</span> Personal Information
            </h3>
            
            {detailsStatus.msg && (
              <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${detailsStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                {detailsStatus.msg}
              </div>
            )}

            <form onSubmit={handleDetailsSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-400">Full Name</label>
                  <input
                    type="text"
                    value={detailsForm.name}
                    onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })}
                    required
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zoom-blue/50 focus:border-zoom-blue transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-400">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-zinc-950/30 border border-zinc-800/50 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">Email cannot be changed.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-400">Department</label>
                  <input
                    type="text"
                    value={detailsForm.department}
                    onChange={(e) => setDetailsForm({ ...detailsForm, department: e.target.value })}
                    placeholder="E.g., Computer Science"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zoom-blue/50 focus:border-zoom-blue transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-400">Student ID / Identifier</label>
                  <input
                    type="text"
                    value={detailsForm.studentId}
                    onChange={(e) => setDetailsForm({ ...detailsForm, studentId: e.target.value })}
                    placeholder="Optional"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zoom-blue/50 focus:border-zoom-blue transition-all"
                  />
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingDetails}
                  className="bg-zoom-blue hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-zoom-blue/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isUpdatingDetails ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Password Form Card */}
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-zoom-blue">🔒</span> Security
            </h3>

            {passStatus.msg && (
              <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${passStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                {passStatus.msg}
              </div>
            )}

            <form onSubmit={handlePassSubmit} className="space-y-5">
              <div className="space-y-1.5 max-w-md">
                <label className="text-sm font-medium text-zinc-400">Current Password</label>
                <input
                  type="password"
                  value={passForm.currentPassword}
                  onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                  required
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zoom-blue/50 focus:border-zoom-blue transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-zinc-800/50 mt-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-400">New Password</label>
                  <input
                    type="password"
                    value={passForm.newPassword}
                    onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                    required
                    minLength={6}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zoom-blue/50 focus:border-zoom-blue transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-400">Confirm New Password</label>
                  <input
                    type="password"
                    value={passForm.confirmPassword}
                    onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zoom-blue/50 focus:border-zoom-blue transition-all"
                  />
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPass}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-zinc-600 px-6 py-3 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {isUpdatingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
