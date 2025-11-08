import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Users, 
  BookOpen, 
  FileText, 
  ClipboardList, 
  LogOut,
  GraduationCap,
  Search,
  Key,
  Bell,
  Menu as MenuIcon,
  X,
  User,
  Sun,
  Moon
} from 'lucide-react';
import About from './About';
import { classroomsApi } from '../api/classrooms';
import { joinRequestsApi } from '../api/joinRequests';

export default function Dashboard() {
  const { currentUser, userProfile, logout, updateUserProfile } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateClassroom, setShowCreateClassroom] = useState(false);
  const [showJoinClassroom, setShowJoinClassroom] = useState(false);
  const [joinKey, setJoinKey] = useState('');
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [joinPending, setJoinPending] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [myPendingJoins, setMyPendingJoins] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchClassrooms();
      fetchJoinRequests();
      fetchMyPendingJoins();
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const enabled = saved === 'dark';
      setIsDark(enabled);
      document.documentElement.classList.toggle('dark', enabled);
    } catch {}
  }, []);

  // When opening profile modal, prefill name
  useEffect(() => {
    if (showProfileModal) {
      setEditingName(false);
      setEditName(userProfile?.full_name || currentUser?.displayName || '');
    }
  }, [showProfileModal, userProfile, currentUser]);

  function toggleDarkMode() {
    const next = !isDark;
    setIsDark(next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
    document.documentElement.classList.toggle('dark', next);
  }

  async function handleDeleteAccount() {
    if (!currentUser) return;
    const confirmDel = window.confirm('Delete your account permanently? This cannot be undone.');
    if (!confirmDel) return;
    const password = window.prompt('Please enter your password to confirm:');
    if (!password) return;
    try {
      // Reauthenticate
      const cred = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, cred);

      // Delete Supabase user row first
      try { await api.delete(`/api/users/${currentUser.uid}`); } catch {}

      // Delete Firebase user
      await deleteUser(currentUser);

      // Navigate to login
      navigate('/signup');
    } catch (e) {
      alert(e?.message || 'Failed to delete account. Please check your password and try again.');
    }
  }

  

  // Student cancels their own pending join request
  async function cancelMyPendingJoin(joinRequestId) {
    try {
      const jr = await joinRequestsApi.get(joinRequestId);
      await joinRequestsApi.cancel(joinRequestId, {
        classroom_id: jr?.classroom_id,
        classroom_name: jr?.classrooms?.name,
        tutor_id: jr?.classrooms?.tutor_id,
        student_id: currentUser.uid,
        student_name: userProfile?.full_name || currentUser.email
      });
      await fetchMyPendingJoins();
    } catch (e) {
      // no-op
    }
  }

  // Filter classrooms on search without mutating counts
  useEffect(() => {
    const term = (searchTerm || '').toLowerCase();
    if (!term) {
      setClassrooms(Array.isArray(allClassrooms) ? allClassrooms : []);
    } else {
      const filtered = (Array.isArray(allClassrooms) ? allClassrooms : []).filter(membership =>
        membership?.classrooms?.name?.toLowerCase().includes(term) ||
        (membership?.classrooms?.description || '').toLowerCase().includes(term)
      );
      setClassrooms(filtered);
    }
  }, [searchTerm, allClassrooms]);

  async function fetchClassrooms() {
    if (!currentUser) return;
    try {
      const data = await classroomsApi.mine(currentUser.uid);
      // Ensure data is always an array
      const classroomsArray = Array.isArray(data) ? data : [];
      setClassrooms(classroomsArray);
      setAllClassrooms(classroomsArray);
    } catch {
      setClassrooms([]);
      setAllClassrooms([]);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function fetchJoinRequests() {
    try {
      const mine = await joinRequestsApi.tutor(currentUser?.uid);
      // Ensure data is always an array
      const joinRequestsArray = Array.isArray(mine) ? mine : [];
      setJoinRequests(joinRequestsArray);
    } catch (e) {
      // Table may not exist yet; ignore
      setJoinRequests([]);
    }
  }


  async function fetchMyPendingJoins() {
    try {
      const data = await joinRequestsApi.mine(currentUser?.uid);
      // Ensure data is always an array
      const pendingJoinsArray = Array.isArray(data) ? data : [];
      setMyPendingJoins(pendingJoinsArray);
    } catch (e) {
      console.error('Failed to fetch pending joins:', e);
      setMyPendingJoins([]);
      setError('Failed to load pending requests. Please refresh the page.');
    }
  }

  async function acceptJoinRequest(req) {
    try {
      await joinRequestsApi.accept(req.id, { classroom_id: req.classroom_id, student_id: req.student_id });
      await fetchJoinRequests();
      await fetchClassrooms();
    } catch (e) {
      // no-op
    }
  }

  async function rejectJoinRequest(req) {
    try {
      await joinRequestsApi.reject(req.id, { classroom_id: req.classroom_id, student_id: req.student_id, classroom_name: req.classrooms?.name });
      await fetchJoinRequests();
    } catch (e) {
      // no-op
    }
  }

  async function handleJoinClassroom(e) {
    e.preventDefault();
    setError('');
    setJoinPending(false);

    if (!joinKey || joinKey.trim() === '') {
      setError('Please enter a security key');
      return;
    }

    try {
      await classroomsApi.join({
        security_key: joinKey.trim(),
        user_id: currentUser.uid,
        student_name: userProfile?.full_name || currentUser.email
      });

      setJoinPending(true);
      setError('');
      await fetchJoinRequests();
      await fetchMyPendingJoins();
      
    } catch (error) {
      console.error('Join classroom error:', error);
      setError(error.message || 'Failed to process your request. Please try again.');
    }
  }

  // moved to backend API

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-gray-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black dark:text-gray-100 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 shadow-sm border-b border-gray-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">EduHub</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notification bell (mobile and desktop) */}
              {Array.isArray(classrooms) && classrooms.some(c => c.role === 'tutor') && (
                <div className="relative">
                  <button
                    className="relative p-2 text-gray-600 hover:text-gray-900"
                    onClick={async () => { await fetchJoinRequests(); setNotifOpen(v => !v); }}
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {Array.isArray(joinRequests) && joinRequests.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">
                        {joinRequests.length}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-40">
                      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                          <button onClick={() => setNotifOpen(false)} className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">Close</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {/* Tutor-only Join Requests */}
                          {Array.isArray(classrooms) && classrooms.some(c => c.role === 'tutor') && (
                            <div className="mb-4">
                              <div className="text-sm font-semibold mb-2">Join Requests</div>
                              {!Array.isArray(joinRequests) || joinRequests.length === 0 ? (
                                <div className="p-3 text-sm text-gray-500 dark:text-gray-400 border rounded dark:border-neutral-800">No pending requests</div>
                              ) : (
                                joinRequests.map(req => (
                                  <div key={req.id} className="p-3 border rounded mb-2 dark:border-neutral-800">
                                    <div className="flex items-start justify-between">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{req.users?.full_name || req.users?.email || req.student_id}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{req.users?.email}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Class: {req.classrooms?.name}</div>
                                      </div>
                                      <div className="flex-shrink-0 ml-2 flex space-x-2">
                                        <button onClick={() => acceptJoinRequest(req)} className="px-2 py-1 bg-green-600 text-white text-xs rounded">Accept</button>
                                        <button onClick={() => rejectJoinRequest(req)} className="px-2 py-1 bg-red-600 text-white text-xs rounded">Reject</button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Actions area visible on desktop; hamburger visible on desktop too */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Toggle theme"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className="flex items-center space-x-4"></div>
              {/* Hamburger visible on all sizes */}
              <button className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white" onClick={() => setMobileMenuOpen(v => !v)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-end z-40">
          <div className="w-64 h-full bg-white dark:bg-neutral-900 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-gray-900 dark:text-gray-100">Menu</div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => { setShowProfileModal(true); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-start px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-800 dark:text-gray-100"
              >
                <User className="h-5 w-5 mr-2" /> Profile
              </button>
              <button
                onClick={() => { setShowAboutModal(true); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-start px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-800 dark:text-gray-100"
              >
                About
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); handleDeleteAccount(); }}
                className="w-full flex items-center justify-start px-3 py-2 rounded border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                Delete Account
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center justify-start px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-800 dark:text-gray-100"
              >
                <LogOut className="h-5 w-5 mr-2" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Greeting */}
        <div className="mb-6">
          <div className="bg-white dark:bg-black p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800">
            <div className="text-xl font-semibold text-gray-900 dark:text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-rose-400">
              Welcome{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}!
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Manage your classes, assignments, and quizzes from here.</div>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-md border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center">
              <BookOpen className="h-10 w-10 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Classrooms</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Array.isArray(allClassrooms) ? allClassrooms.length : 0}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-md border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center">
              <GraduationCap className="h-10 w-10 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">As Tutor</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Array.isArray(allClassrooms) ? allClassrooms.filter(c => c.role === 'tutor').length : 0}
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-md border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center">
              <Users className="h-10 w-10 text-gray-600 dark:text-gray-300" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">As Student</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Array.isArray(allClassrooms) ? allClassrooms.filter(c => c.role === 'student').length : 0}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" />
                <input
                  type="text"
                  placeholder="Search classrooms..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 w-full sm:w-auto">
              <button
                onClick={() => setShowCreateClassroom(true)}
                className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-primary-600 to-emerald-600 text-white rounded-lg shadow hover:opacity-90 transition w-full sm:w-auto min-w-[180px]"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Classroom
              </button>
              <button
                onClick={() => setShowJoinClassroom(true)}
                className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-primary-600 to-green-600 text-white rounded-lg shadow hover:opacity-90 transition w-full sm:w-auto min-w-[180px]"
              >
                <Key className="h-5 w-5 mr-2" />
                Join Classroom
              </button>
            </div>
          </div>
        </div>

        {/* Student pending join banner */}
        {Array.isArray(myPendingJoins) && myPendingJoins.length > 0 && (
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md text-sm">
              <div className="font-medium mb-1">You have {myPendingJoins.length} pending join request{myPendingJoins.length > 1 ? 's' : ''}:</div>
              <ul className="list-disc list-inside space-y-1">
                {myPendingJoins.map(j => (
                  <li key={j.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{j.classrooms?.name || j.classroom_id}</span>
                    <button
                      onClick={() => cancelMyPendingJoin(j.id)}
                      className="px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs flex-shrink-0"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Classrooms Grid (full width cards) */}
        <div className="grid grid-cols-1 gap-6">
          {(Array.isArray(classrooms) ? classrooms : []).map((membership) => {
            const classroom = membership.classrooms;
            return (
              <div
                key={classroom.id}
                className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg hover:shadow-xl transition cursor-pointer overflow-hidden w-full"
                onClick={() => navigate(`/classroom/${classroom.id}`)}
              >
                <div className="h-1 bg-gradient-to-r from-primary-600 via-emerald-500 to-green-500"></div>
                <div className="p-4 sm:p-8 flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  <div className="flex-shrink-0 mr-0 sm:mr-1">
                    <div className="h-12 w-20 sm:h-16 sm:w-28 bg-primary-50 dark:bg-primary-900/30 rounded-md flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-primary-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-1 gap-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 md:truncate break-words">
                        {classroom.name}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800`}>
                          {membership.role=="tutor" ? "Tutor" : "Student"}
                        </span>
                        {membership.role === 'tutor' && (
                          <button
                            className="px-2 py-1 text-red-600 hover:text-red-800 text-xs border border-red-600 dark:border-red-800 rounded"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const ok = window.confirm('Delete this classroom? This will remove memberships.');
                              if (!ok) return;
                              try {
                                await classroomsApi.delete(classroom.id);
                                fetchClassrooms();
                              } catch {}
                            }}
                            title="Delete classroom"
                          >
                            Delete
                          </button>
                        )}
                        {membership.role === 'student' && (
                          <button
                            className="px-2 py-1 text-red-600 hover:text-red-800 text-xs border border-red-200 dark:border-red-800 rounded"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const ok = window.confirm('Exit this classroom?');
                              if (!ok) return;
                              try {
                                await classroomsApi.leave({ classroom_id: classroom.id, user_id: currentUser.uid });
                                fetchClassrooms();
                              } catch {}
                            }}
                            title="Exit classroom"
                          >
                            Exit
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-base mb-3 truncate">
                      {classroom.description || 'No description provided'}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-6">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1" />
                        <span>Created {new Date(classroom.created_at).toLocaleDateString()}</span>
                      </div>
                      
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(!Array.isArray(classrooms) || classrooms.length === 0) && (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No classrooms</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first classroom to get started
            </p>
          </div>
        )}
      </div>

      {/* Create Classroom Modal */}
      {showCreateClassroom && (
        <CreateClassroomModal
          onClose={() => setShowCreateClassroom(false)}
          onSuccess={() => {
            setShowCreateClassroom(false);
            fetchClassrooms();
          }}
        />
      )}

      {/* Join Classroom Modal */}
      {showJoinClassroom && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Join Classroom</h3>
              <button 
                onClick={() => {
                  setShowJoinClassroom(false);
                  setError('');
                  setJoinKey('');
                  setJoinPending(false);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleJoinClassroom}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Security Key
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={joinKey}
                  onChange={(e) => {
                    setJoinKey(e.target.value);
                    setError(''); // Clear error when typing
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Enter classroom security key"
                  required
                  disabled={joinPending}
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Ask your teacher for the classroom security key
                </p>
              </div>

              {/* Status Messages */}
              {joinPending ? (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        <span className="font-medium">Request sent!</span> Waiting for tutor approval.
                      </p>
                      <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                        You'll be notified when your request is approved.
                      </p>
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end space-x-3 pt-2">
                {!joinPending && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinClassroom(false);
                      setError('');
                      setJoinKey('');
                      setJoinPending(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                )}
                
                {!joinPending && (
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    disabled={!joinKey.trim()}
                  >
                    Send Join Request
                  </button>
                )}
              </div>
            </form>
            
          </div>
        </div>
      )}

      {/* Profile Details Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile Details</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">Close</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-32 text-gray-500 dark:text-gray-400 mt-2">Name</div>
                <div className="flex-1">
                  {!editingName ? (
                    <div className="flex items-center justify-between">
                      <div className="break-words text-gray-900 dark:text-gray-100">{userProfile?.full_name || currentUser?.displayName || '-'}</div>
                      <button
                        className="ml-3 px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-100 dark:hover:bg-neutral-800"
                        onClick={() => setEditingName(true)}
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100"
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 text-xs rounded bg-primary-600 text-white hover:bg-primary-700"
                          onClick={async () => {
                            try {
                              const name = (editName || '').trim();
                              if (!name) return;
                              await updateUserProfile({ full_name: name });
                              setEditingName(false);
                            } catch (e) {
                              alert(e?.message || 'Failed to update name');
                            }
                          }}
                        >
                          Save
                        </button>
                        <button
                          className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-100 dark:hover:bg-neutral-800"
                          onClick={() => {
                            setEditingName(false);
                            setEditName(userProfile?.full_name || currentUser?.displayName || '');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex"><div className="w-32 text-gray-500 dark:text-gray-400">Email</div><div className="flex-1 break-words text-gray-900 dark:text-gray-100">{currentUser?.email || '-'}</div></div>
              <div className="flex"><div className="w-32 text-gray-500 dark:text-gray-400">User ID</div><div className="flex-1 break-all text-gray-900 dark:text-gray-100">{currentUser?.uid || '-'}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">About</h3>
              <button onClick={() => setShowAboutModal(false)} className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">Close</button>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <About />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Create Classroom Modal Component (standalone)
function CreateClassroomModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    security_key: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  function generateKey() {
    const letters = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    const digits = String(Math.floor(100 + Math.random() * 900));
    return `${letters}-${digits}`;
  }

  useEffect(() => {
    if (!formData.security_key) {
      setFormData((prev) => ({ ...prev, security_key: generateKey() }));
    }
  }, []);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.name) {
        throw new Error('Please enter a classroom name');
      }

      const key = (formData.security_key || generateKey()).toUpperCase();
      await classroomsApi.create({
        name: formData.name,
        description: formData.description,
        security_key: key,
        tutor_id: currentUser.uid,
        tutor_email: currentUser.email ?? null,
        tutor_full_name: currentUser.displayName ?? null
      });

      onSuccess();
    } catch (err) {
      console.error('Create classroom error:', err);
      setError(err?.message || 'Failed to create classroom');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Create Classroom</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Classroom Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Enter classroom name"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Enter classroom description"
            />
          </div>
          <div className="mb-4">
            <label className="block text sm font-medium text-gray-700 dark:text-gray-200 mb-2">Security Key</label>
            <div className="relative">
              <input
                type="text"
                name="security_key"
                value={formData.security_key}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 uppercase dark:bg-neutral-800 dark:text-red-500 text-red-600 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-neutral-800"
                readOnly
                placeholder="Auto-generated"
                required
                minLength={6}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This access key is fixed and cannot be modified. Share it with others to grant them access to your classroom.
              </p>
            </div>
          </div>
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-3 py-2 rounded-md text-sm">{error}</div>
          )}
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">{loading ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
