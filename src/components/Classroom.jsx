import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// Using Supabase Storage instead of Firebase Storage
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Users, 
  ClipboardList, 
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Menu as MenuIcon,
  X,
  Info,
  Key,
  Home
} from 'lucide-react';
import { classroomsApi } from '../api/classrooms';
import { notificationsApi } from '../api/notifications';
import { documentsApi } from '../api/documents';
import { assignmentsApi } from '../api/assignments';
import { quizzesApi } from '../api/quizzes';

export default function Classroom() {
  const { classroomId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hideHomeButton = location.pathname === '/login' || location.pathname === '/signup';
  const [classroom, setClassroom] = useState(null);
  const [members, setMembers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showClassInfo, setShowClassInfo] = useState(false);
  const [notifToast, setNotifToast] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [myNotifications, setMyNotifications] = useState([]);
  const [userCredit, setUserCredit] = useState(0);
  const [memberCredits, setMemberCredits] = useState({});

  function onMemberRemovedLocal(userId) {
    setMembers(prev => (prev || []).filter(m => m.user_id !== userId));
  }

  useEffect(() => {
    fetchClassroomData();
  }, [classroomId]);

  // Realtime: show toast when this user receives a rejection notification
  useEffect(() => {
    // Realtime removed; notifications will be loaded on demand
  }, [currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchNotifications();
    }
  }, [currentUser?.uid]);

  async function fetchNotifications() {
    try {
      const data = await notificationsApi.list(currentUser?.uid);
      setMyNotifications(data || []);
    } catch (e) {
      setMyNotifications([]);
    }
  }

  async function dismissNotification(id) {
    try {
      await notificationsApi.delete(id);
    } catch (e) {}
  }

  async function fetchClassroomData() {
    try {
      const full = await classroomsApi.full(classroomId, currentUser.uid);
      setClassroom(full.classroom);
      setMembers(full.members || []);
      setDocuments(full.documents || []);
      setAssignments(full.assignments || []);
      setQuizzes(full.quizzes || []);
      setUserCredit(full.userCredit || 0);
      setMemberCredits(full.memberCredits || {});

    } catch (error) {
      console.error('Error fetching classroom data:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  const isTutor = members.find(m => m.user_id === currentUser.uid)?.role === 'tutor';

  async function recordDocumentView(documentId) {
    try {
      if (!currentUser?.uid) return;
      await documentsApi.view(documentId, currentUser.uid);
    } catch (e) {
      console.error('Failed to record document view', e);
    }
  }

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
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{classroom.name}</h1>
            </div>
            <div className="ml-auto flex items-center space-x-3">
              {/* Student credit badge */}
              {(!isTutor) && (
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium dark:bg-neutral-800 dark:text-gray-100 border border-green-200 dark:border-neutral-700" title="Your verified credits">
                  Credit: {userCredit}
                </span>
              )}
              <button
                onClick={() => setShowClassInfo(true)}
                className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg"
                title="Class Info"
              >
                <Info className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile header menu */}
      {/* Mobile header menu removed as class info is available via the info button */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-neutral-800 mb-8">
          <nav className="-mb-px flex space-x-6 overflow-x-auto whitespace-nowrap hide-scrollbar">
            {[
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'assignments', label: 'Assignments', icon: ClipboardList },
              { id: 'quizzes', label: 'Quizzes', icon: ClipboardList },
              { id: 'members', label: 'Members', icon: Users }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center flex-none py-2 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-neutral-700'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'documents' && (
          <DocumentsTab
            documents={documents}
            isTutor={isTutor}
            onUpload={() => setShowUploadModal(true)}
            classroomId={classroomId}
            onRefresh={fetchClassroomData}
            onRecordView={recordDocumentView}
            onShowInfo={(docId) => {
              setSelectedDocumentId(docId);
              setShowViewsModal(true);
            }}
          />
        )}

        {activeTab === 'assignments' && (
          <AssignmentsTab
            assignments={assignments}
            isTutor={isTutor}
            onCreate={() => setShowAssignmentModal(true)}
            classroomId={classroomId}
            onRefresh={fetchClassroomData}
          />
        )}

        {activeTab === 'quizzes' && (
          <QuizzesTab
            quizzes={quizzes}
            isTutor={isTutor}
            onCreate={() => setShowQuizModal(true)}
            classroomId={classroomId}
            onRefresh={fetchClassroomData}
          />
        )}

        {activeTab === 'members' && (
          <MembersTab
            members={members}
            isTutor={isTutor}
            classroomId={classroomId}
            onRefresh={fetchClassroomData}
            onMemberRemoved={onMemberRemovedLocal}
            memberCredits={memberCredits}
          />
        )}
      </div>

      {/* Floating Home button (hidden on auth routes) */}
      {!hideHomeButton && (
        <button
          onClick={() => navigate('/dashboard')}
          title="Home"
          className="fixed right-6 bottom-6 z-40 h-12 w-12 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 focus:outline-none flex items-center justify-center border border-primary-700"
        >
          <Home className="h-6 w-6" />
        </button>
      )}

      {/* Modals */}
      {showUploadModal && (
        <DocumentUploadModal
          classroomId={classroomId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchClassroomData();
          }}
        />
      )}

      {showAssignmentModal && (
        <AssignmentModal
          classroomId={classroomId}
          onClose={() => setShowAssignmentModal(false)}
          onSuccess={() => {
            setShowAssignmentModal(false);
            fetchClassroomData();
          }}
        />
      )}

      {showQuizModal && (
        <QuizModal
          classroomId={classroomId}
          onClose={() => setShowQuizModal(false)}
          onSuccess={() => {
            setShowQuizModal(false);
            fetchClassroomData();
          }}
        />
      )}

      {showViewsModal && selectedDocumentId && (
        <DocumentViewsModal
          documentId={selectedDocumentId}
          onClose={() => {
            setShowViewsModal(false);
            setSelectedDocumentId(null);
          }}
        />
      )}
      {showClassInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Class Info</h3>
              <button onClick={() => setShowClassInfo(false)} className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">Close</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex"><div className="w-36 text-gray-500 dark:text-gray-400">Classroom</div><div className="flex-1 break-words text-gray-900 dark:text-gray-100">{classroom?.name}</div></div>
              <div className="flex"><div className="w-36 text-gray-500 dark:text-gray-400">Security Key</div><div className="flex-1 break-words font-mono text-gray-900 dark:text-gray-100">{classroom?.security_key}</div></div>
              <div className="flex"><div className="w-36 text-gray-500 dark:text-gray-400">Tutor</div><div className="flex-1 break-words text-gray-900 dark:text-gray-100">{(members.find(m => m.role === 'tutor')?.users?.full_name) || (members.find(m => m.role === 'tutor')?.users?.email) || classroom?.tutor_id}</div></div>
              <div className="flex"><div className="w-36 text-gray-500 dark:text-gray-400">Members</div><div className="flex-1 break-words text-gray-900 dark:text-gray-100">{members.length}</div></div>
            </div>
          </div>
        </div>
      )}
      {notifToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white dark:bg-neutral-900 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800 rounded-lg p-4 max-w-sm">
            <div className="flex items-start justify-between">
              <div className="pr-3 text-sm text-gray-800 dark:text-gray-100">{notifToast.message}</div>
              <button
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-sm"
                onClick={async () => {
                  try { await notificationsApi.delete(notifToast.id); } catch {}
                  setNotifToast(null);
                }}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Assignment Modal Component (Title only; tutor creates topic)
function AssignmentModal({ classroomId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ title: '', description: '', due_date: '', points_possible: 100 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await assignmentsApi.create({
        classroom_id: classroomId,
        created_by: currentUser.uid,
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date || null,
        points_possible: formData.points_possible ? parseInt(formData.points_possible) : null
      });
      onSuccess();
    } catch (err) {
      console.error('Create assignment error', err);
      setError((err && (err.message || err.details || err.hint)) || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Create Assignment</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Enter assignment title"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Enter assignment description"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Score</label>
              <input
                type="number"
                name="points_possible"
                value={formData.points_possible}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100"
                placeholder="Points"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Due Date</label>
              <input
                type="datetime-local"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100"
              />
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

// Quiz Modal Component
function QuizModal({ classroomId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ title: '', description: '', time_limit: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await quizzesApi.create({
        classroom_id: classroomId,
        created_by: currentUser.uid,
        title: formData.title,
        description: formData.description || null,
        time_limit: formData.time_limit ? parseInt(formData.time_limit) : null
      });
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Create Quiz</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Enter quiz title"
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
              placeholder="Enter quiz description"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Time Limit (minutes)</label>
            <input
              type="number"
              name="time_limit"
              value={formData.time_limit}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100"
              placeholder="Optional time limit"
            />
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

// Documents Tab Component
function DocumentsTab({ documents, isTutor, onUpload, classroomId, onRefresh, onRecordView, onShowInfo }) {
  return (
    <div>
      {isTutor && (
        <div className="mb-6">
          <button
            onClick={onUpload}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Document
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-neutral-800">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {doc.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Uploaded by {doc.users?.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            
            {doc.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                {doc.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {doc.file_type} • {(doc.file_size / 1024).toFixed(1)} KB
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={async () => {
                    try { await onRecordView?.(doc.id); } catch {}
                    window.open(doc.file_url, '_blank');
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = doc.file_url;
                    link.download = doc.file_name;
                    link.click();
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                {isTutor && (
                  <button
                    onClick={async () => {
                      const ok = window.confirm('Delete this document?');
                      if (!ok) return;
                      try { await documentsApi.delete(doc.id); await onRefresh?.(); } catch {}
                  }}
                  className="p-2 text-red-600 hover:text-red-900"
                  title="Delete Document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                )}
                {isTutor && (
                  <button
                    onClick={() => onShowInfo?.(doc.id)}
                    className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    title="Show Info"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No documents</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isTutor ? 'Upload your first document to get started' : 'No documents uploaded yet'}
          </p>
        </div>
      )}
    </div>
  );
}

// Assignments Tab Component
function AssignmentsTab({ assignments, isTutor, onCreate, classroomId, onRefresh }) {
  const navigate = useNavigate();
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <div>
      {isTutor && (
        <div className="mb-6">
          <button
            onClick={onCreate}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Assignment
          </button>
        </div>
      )}

      <div className="space-y-4">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-neutral-800">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {assignment.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Created by {assignment.users?.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(assignment.created_at).toLocaleDateString()}
                </p>
                {assignment.description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-3">
                    {assignment.description}
                  </p>
                )}
                {assignment.due_date && (
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 mt-3">
                    <Calendar className="h-4 w-4 mr-2" />
                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="text-right ml-4">
                {assignment.points_possible != null && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    {assignment.points_possible} credits
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex space-x-4">
                <button 
                  onClick={() => navigate(`/assignment/${assignment.id}`)}
                  className="flex items-center text-primary-600 hover:text-primary-700 text-sm"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </button>
              </div>
              {isTutor && (
                <div className="flex space-x-2">
                  <button
                    className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    onClick={() => { setEditing(assignment); setShowEdit(true); }}
                    title="Edit Assignment"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No assignments</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isTutor ? 'Create your first assignment to get started' : 'No assignments yet'}
          </p>
        </div>
      )}

      {isTutor && showEdit && editing && (
        <EditAssignmentModal
          assignment={editing}
          onClose={() => { setShowEdit(false); setEditing(null); }}
          onSuccess={() => { setShowEdit(false); setEditing(null); onRefresh?.(); }}
        />
      )}
    </div>
  );
}

// Quizzes Tab Component
function QuizzesTab({ quizzes, isTutor, onCreate, classroomId, onRefresh }) {
  const navigate = useNavigate();
  return (
    <div>
      {isTutor && (
        <div className="mb-6">
          <button
            onClick={onCreate}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Quiz
          </button>
        </div>
      )}

      <div className="space-y-4">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-neutral-800">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {quiz.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Created by {quiz.users?.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(quiz.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {quiz.total_points} points
                </span>
                {quiz.time_limit && (
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {quiz.time_limit} minutes
                  </div>
                )}
              </div>
            </div>
            
            {quiz.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {quiz.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex space-x-4">
                <button 
                  onClick={() => navigate(`/quiz/${quiz.id}`)}
                  className="flex items-center text-primary-600 hover:text-primary-700 text-sm"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </button>
                {!isTutor && (
                  <button 
                    onClick={() => navigate(`/quiz/${quiz.id}`)}
                    className="flex items-center text-green-600 hover:text-green-700 text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Take Quiz
                  </button>
                )}
              </div>
              {isTutor && (
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-red-600 hover:text-red-900">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {quizzes.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No quizzes</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isTutor ? 'Create your first quiz to get started' : 'No quizzes yet'}
          </p>
        </div>
      )}
    </div>
  );
}

// Members Tab Component
function MembersTab({ members, isTutor, classroomId, onRefresh, onMemberRemoved, memberCredits }) {
  const [removing, setRemoving] = useState({});
  return (
    <div className="space-y-4">
      {members.map((member) => (
        <div key={member.id} className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-neutral-800">
          <div className="flex items-start sm:items-center">
            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-medium">
                {member.users.full_name?.charAt(0) || member.users.email.charAt(0)}
              </span>
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {member.users.full_name || 'No name'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 break-words">{member.users.email}</p>
            </div>
            <div className="ml-2 sm:ml-4 flex items-center gap-2">
              <span className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap ${
                member.role === 'tutor' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {member.role=='tutor'?'Tutor':'Student'}
              </span>
              {member.role !== 'tutor' && (
                <span className="px-2 py-1 text-xs sm:text-sm font-medium rounded-full bg-emerald-100 text-emerald-800" title="Verified Credits">
                  Credit: {memberCredits?.[member.user_id] || 0}
                </span>
              )}
              {isTutor && member.role !== 'tutor' && (
                <button
                  className="px-2 py-1 text-red-600 hover:text-red-800 text-xs border border-red-200 rounded disabled:opacity-50"
                  disabled={!!removing[member.user_id]}
                  onClick={async () => {
                    const ok = window.confirm(`Remove ${member.users.full_name || member.users.email} from this class?`);
                    if (!ok) return;
                    setRemoving(prev => ({ ...prev, [member.user_id]: true }));
                    try {
                      await classroomsApi.leave({ classroom_id: classroomId, user_id: member.user_id });
                      onMemberRemoved?.(member.user_id);
                      await onRefresh?.();
                    } catch (e) {
                      console.error('Remove member error:', e);
                      alert(`Failed to remove member. ${e?.message || ''}`);
                    } finally {
                      setRemoving(prev => ({ ...prev, [member.user_id]: false }));
                    }
                  }}
                  title="Remove from class"
                >
                  {removing[member.user_id] ? 'Removing...' : 'Remove'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Edit Assignment Modal
function EditAssignmentModal({ assignment, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: assignment?.title || '',
    description: assignment?.description || '',
    due_date: assignment?.due_date ? assignment.due_date.slice(0, 16) : '',
    points_possible: assignment?.points_possible ?? 100
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date || null,
        points_possible: formData.points_possible ? parseInt(formData.points_possible) : null
      };
      await assignmentsApi.update(assignment.id, payload);
      onSuccess?.();
    } catch (err) {
      setError(err?.message || 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Edit Assignment</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Credits</label>
              <input
                type="number"
                name="points_possible"
                value={formData.points_possible}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Due Date</label>
              <input
                type="datetime-local"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100"
              />
            </div>
          </div>
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-3 py-2 rounded-md text-sm">{error}</div>
          )}
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Document Upload Modal Component
function DocumentUploadModal({ classroomId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  function handleChange(e) {
    if (e.target.name === 'file') {
      setFormData({
        ...formData,
        file: e.target.files[0]
      });
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.file) {
        throw new Error('Please select a file');
      }

      await documentsApi.upload({
        classroom_id: classroomId,
        uploaded_by: currentUser.uid,
        title: formData.title,
        description: formData.description,
        file: formData.file
      });

      onSuccess();
    } catch (error) {
      console.error('Error uploading document:', error);
      setError(error?.message || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Upload Document</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Enter document title"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Enter document description"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              File
            </label>
            <input
              type="file"
              name="file"
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100"
              required
            />
          </div>
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Document Views Modal Component
function DocumentViewsModal({ documentId, onClose }) {
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchViews() {
      try {
        const data = await documentsApi.listViews(documentId);
        setViews(data || []);
      } catch (e) {
        console.error('Error fetching document views:', e);
        setError('Failed to load views');
      } finally {
        setLoading(false);
      }
    }
    fetchViews();
  }, [documentId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-lg w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Document Views</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">Close</button>
        </div>
        {loading ? (
          <div className="py-8 text-center text-gray-600 dark:text-gray-300">Loading...</div>
        ) : error ? (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-3 py-2 rounded-md text-sm">{error}</div>
        ) : views.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-2">No views yet</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">No student has opened this document</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {views.map((v) => (
              <div key={`${v.document_id}-${v.user_id}`} className="border border-gray-200 dark:border-neutral-800 rounded-md p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{v.users?.full_name || v.users?.email || v.user_id}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Viewed at {new Date(v.viewed_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
