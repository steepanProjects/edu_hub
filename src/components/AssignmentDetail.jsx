import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
// Using Supabase Storage instead of Firebase Storage
import { ArrowLeft, Upload, FileText, Calendar, Clock, CheckCircle } from 'lucide-react';

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hideHomeButton = location.pathname === '/login' || location.pathname === '/signup';
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [error, setError] = useState('');
  const [isTutor, setIsTutor] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });

  useEffect(() => {
    fetchAssignmentData();
  }, [assignmentId]);

  async function fetchAssignmentData() {
    try {
      // Fetch assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          users (
            full_name
          ),
          classrooms (
            id,
            name
          )
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Check if user is a member of the classroom
      const { data: membership, error: membershipError } = await supabase
        .from('classroom_members')
        .select('*')
        .eq('classroom_id', assignmentData.classroom_id)
        .eq('user_id', currentUser.uid)
        .single();

      if (membershipError || !membership) {
        navigate('/dashboard');
        return;
      }

      setAssignment(assignmentData);
      setIsTutor(membership.role === 'tutor');

      // Fetch existing submission if user is a student
      if (membership.role === 'student') {
        let submissionData = null;
        try {
          const { data, error } = await supabase
            .from('assignment_submissions')
            .select(`
              *,
              users (
                full_name
              )
            `)
            .eq('assignment_id', assignmentId)
            .eq('student_id', currentUser.uid)
            .maybeSingle();
          if (error) throw error;
          submissionData = data;
        } catch (_) {
          const { data } = await supabase
            .from('assignment_submissions')
            .select('*')
            .eq('assignment_id', assignmentId)
            .eq('student_id', currentUser.uid)
            .maybeSingle();
          submissionData = data;
        }

        if (submissionData) setSubmission(submissionData);
      }

    } catch (error) {
      console.error('Error fetching assignment data:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('id, graded_at')
        .eq('assignment_id', assignmentId);
      if (error) throw error;
      const total = data?.length || 0;
      const verified = (data || []).filter(s => s.graded_at).length;
      const pending = total - verified;
      setStats({ total, verified, pending });
    } catch (e) {
      console.error('Fetch stats error', e);
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
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 shadow-sm border-b dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate(`/classroom/${assignment.classroom_id}`)}
              className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg text-gray-700 dark:text-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{assignment.title}</h1>
              <p className="text-gray-600 dark:text-gray-300">{assignment.classrooms.name}</p>
            </div>
            <div className="text-right">
              {assignment.points_possible != null && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  {assignment.points_possible} credits
                </span>
              )}
            </div>
            {isTutor && (
              <button
                onClick={async () => { await fetchStats(); setShowStats(true); }}
                className="ml-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded"
                title="Assignment Info"
              >
                Info
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-neutral-800">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Assignment Details
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Created by {assignment.users.full_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(assignment.created_at).toLocaleDateString()}
              </p>
            </div>
            {assignment.due_date && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                <Calendar className="h-4 w-4 mr-2" />
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {assignment.description}
            </p>
          </div>
        </div>

        {/* Submission Section */}
        {!isTutor && (
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-neutral-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Your Submission
            </h3>
            
            {submission ? (
              <div className="border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Submitted</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {new Date(submission.submitted_at).toLocaleDateString()} at{' '}
                      {new Date(submission.submitted_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {submission.points_earned !== null ? (
                    <div className="text-right w-full sm:w-auto">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        Credits: {submission.points_earned}/{assignment.points_possible}
                      </span>
                    </div>
                  ) : (
                    <div className="text-right w-full sm:w-auto">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full whitespace-nowrap">
                        Waiting verification by tutor
                      </span>
                    </div>
                  )}
                </div>

                {(() => { const txt = (submission.submission_text || '').split('\n').filter(l => !l.startsWith('File: ') && !l.startsWith('FileName: ')).join('\n').trim(); return txt ? (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Text Response:</h5>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-neutral-800 p-3 rounded">
                      {txt}
                    </p>
                  </div>
                ) : null; })()}

                {(() => { const lines = (submission.submission_text || '').split('\n'); const line = lines.find(l => l.startsWith('File: ')); const url = line ? line.slice(6).trim() : null; const nameLine = lines.find(l => l.startsWith('FileName: ')); let fname = nameLine ? nameLine.slice(10).trim() : null; if (!fname && url) { try { const last = url.substring(url.lastIndexOf('/')+1); fname = decodeURIComponent(last.substring(last.indexOf('-')+1)); } catch {} } return url ? (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Attached File:</h5>
                    <div className="flex items-center flex-wrap gap-2">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[70vw] sm:max-w-xs">{fname || 'Attachment'}</span>
                      <button
                        onClick={() => window.open(url, '_blank')}
                        className="ml-4 text-primary-600 hover:text-primary-700 text-sm"
                      >
                        View File
                      </button>
                    </div>
                  </div>
                ) : null; })()}

                {!isTutor && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={async () => {
                        try {
                          await supabase
                            .from('assignment_submissions')
                            .delete()
                            .eq('assignment_id', assignmentId)
                            .eq('student_id', currentUser.uid);
                          setSubmission(null);
                          fetchAssignmentData();
                        } catch (e) {
                          alert('Failed to delete submission');
                        }
                      }}
                      className="px-3 py-1 text-red-600 hover:text-red-800 text-sm border border-red-300 dark:border-red-800 rounded"
                    >
                      Delete Submission
                    </button>
                  </div>
                )}

                {submission.feedback && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Feedback:</h5>
                    <p className="text-gray-700 dark:text-gray-300">{submission.feedback}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No submission yet</h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Submit your assignment to get started
                </p>
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Submit Assignment
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tutor View - Submissions */}
        {isTutor && (
          <AssignmentSubmissions assignmentId={assignmentId} />
        )}
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <SubmitAssignmentModal
          assignmentId={assignmentId}
          onClose={() => setShowSubmitModal(false)}
          onSuccess={() => {
            setShowSubmitModal(false);
            fetchAssignmentData();
          }}
        />
      )}

      {/* Tutor Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Assignment Info</h3>
              <button onClick={() => setShowStats(false)} className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">Close</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Total submissions</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Verified</span>
                <span className="font-medium text-green-700 dark:text-green-400">{stats.verified}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Not verified</span>
                <span className="font-medium text-yellow-700 dark:text-yellow-400">{stats.pending}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Floating Home button (hidden on auth routes) */}
      {!hideHomeButton && (
        <button
          onClick={() => navigate('/dashboard')}
          title="Home"
          className="fixed right-6 bottom-6 z-40 h-12 w-12 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 focus:outline-none flex items-center justify-center border border-primary-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 1-1.06 1.06l-.9-.9V20.5A2.25 2.25 0 0 1 17 22.75H7A2.25 2.25 0 0 1 4.75 20.5v-7.81l-.9.9a.75.75 0 1 1-1.06-1.06l8.69-8.69Z"/><path d="M12 5.25l6.5 6.5V20.5A.75.75 0 0 1 17.75 21.25H6.25A.75.75 0 0 1 5.5 20.5V11.75l6.5-6.5Z"/></svg>
        </button>
      )}
    </div>
  );
}

// Submit Assignment Modal Component
function SubmitAssignmentModal({ assignmentId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    content: '',
    file: null,
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
      // Ensure user exists in users table (FK safety and policy expectations)
      try {
        const upsertPayload = {
          id: currentUser.uid,
          email: currentUser.email ?? null,
          full_name: currentUser.displayName ?? null
        };
        const { error: upErr } = await supabase.from('users').upsert(upsertPayload, { onConflict: 'id' });
        if (upErr) throw upErr;
      } catch (uerr) {
        console.error('User upsert failed', uerr);
      }
      let uploadedUrl = null;
      if (formData.file) {
        const filename = `${Date.now()}-${formData.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(`${assignmentId}/${filename}`, formData.file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(`${assignmentId}/${filename}`);
        uploadedUrl = urlData.publicUrl;
      }

      // Build submission_text to include optional file URL
      const submission_text = [
        formData.content?.trim() || '',
        uploadedUrl ? `File: ${uploadedUrl}` : '',
        formData.file?.name ? `FileName: ${formData.file.name}` : ''
      ].filter(Boolean).join('\n\n');

      const { error } = await supabase
        .from('assignment_submissions')
        .upsert({
          assignment_id: assignmentId,
          student_id: currentUser.uid,
          submission_text: submission_text || null
        }, { onConflict: 'assignment_id,student_id' });

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      setError(error?.message || error?.details || 'Failed to submit assignment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-neutral-800 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Submit Assignment</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Text Response (Optional)
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Enter your response here..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Attach File (Optional)
            </label>
            <input
              type="file"
              name="file"
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
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
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!formData.content && !formData.file)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Assignment Submissions Component (for tutors)
function AssignmentSubmissions({ assignmentId }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentPoints, setAssignmentPoints] = useState(null);
  const [gradeInputs, setGradeInputs] = useState({});
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  async function fetchSubmissions() {
    try {
      const { data: aData } = await supabase
        .from('assignments')
        .select('points_possible')
        .eq('id', assignmentId)
        .single();
      setAssignmentPoints(aData?.points_possible ?? null);

      let data = null;
      try {
        const res = await supabase
          .from('assignment_submissions')
          .select(`
            id, submission_text, points_earned, graded_at, users ( full_name, email ), submitted_at
          `)
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });
        if (res.error) throw res.error;
        data = res.data;
      } catch (_) {
        const res2 = await supabase
          .from('assignment_submissions')
          .select('id, submission_text, points_earned, graded_at, submitted_at')
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });
        data = res2.data || [];
      }
      // Filter: only include submissions marked ShowToTutor: on (or missing flag)
      const filtered = (data || []).filter(s => {
        const t = s?.submission_text || '';
        if (!t) return true; // empty text -> show
        const hasFlag = /(^|\n)\s*ShowToTutor:\s*(on|off)/i.test(t);
        if (!hasFlag) return true; // backward compatibility -> show
        return /(^|\n)\s*ShowToTutor:\s*on/i.test(t);
      });
      setSubmissions(filtered);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  async function verifySubmission(id) {
    try {
      let grade = Number(
        gradeInputs?.[id] != null && gradeInputs?.[id] !== ''
          ? gradeInputs[id]
          : (assignmentPoints ?? 0)
      ) || 0;
      if (assignmentPoints != null) {
        if (grade > assignmentPoints) grade = assignmentPoints;
        if (grade < 0) grade = 0;
      } else {
        if (grade < 0) grade = 0;
      }
      const { error } = await supabase
        .from('assignment_submissions')
        .update({ points_earned: grade, graded_at: new Date().toISOString(), graded_by: currentUser.uid })
        .eq('id', id);
      if (error) throw error;
      await fetchSubmissions();
    } catch (e) {
      console.error('Verify submission error:', e);
      alert('Failed to verify submission');
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Student Submissions ({submissions.length})
      </h3>
      
      {submissions.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h4>
          <p className="text-gray-600">Students haven't submitted their assignments yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-neutral-800 flex items-center justify-center text-primary-700 dark:text-primary-300 flex-shrink-0">
                    {(submission.users?.full_name?.[0] || submission.users?.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {submission.users?.full_name || submission.users?.email}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{submission.users?.email}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Submitted {new Date(submission.submitted_at).toLocaleDateString()} at{' '}
                      {new Date(submission.submitted_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {submission.points_earned !== null && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full whitespace-nowrap">
                    {submission.points_earned} credits
                  </span>
                )}
              </div>

              {(() => { const txt = (submission.submission_text || '').split('\n').filter(l => !l.startsWith('File: ') && !l.startsWith('FileName: ')).join('\n').trim(); return txt ? (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-200 mb-2">Response:</h5>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-neutral-800 p-3 rounded">
                    {txt}
                  </p>
                </div>
              ) : null; })()}

              {(() => { const lines = (submission.submission_text || '').split('\n'); const line = lines.find(l => l.startsWith('File: ')); const url = line ? line.slice(6).trim() : null; const nameLine = lines.find(l => l.startsWith('FileName: ')); let fname = nameLine ? nameLine.slice(10).trim() : null; if (!fname && url) { try { const last = url.substring(url.lastIndexOf('/')+1); fname = decodeURIComponent(last.substring(last.indexOf('-')+1)); } catch {} } return url ? (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-200 mb-2">Attached File:</h5>
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-yellow-500 truncate max-w-xs">{fname || 'Attachment'}</span>
                    <button
                      onClick={() => window.open(url, '_blank')}
                      className="ml-4 text-primary-600 hover:text-primary-700 text-sm"
                    >
                      View File
                    </button>
                  </div>
                </div>
              ) : null; })()}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Points:</label>
                  <input
                    type="number"
                    min="0"
                    max={assignmentPoints ?? undefined}
                    value={gradeInputs[submission.id] ?? (submission.points_earned ?? assignmentPoints ?? 0)}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (v === '') return setGradeInputs(prev => ({ ...prev, [submission.id]: '' }));
                      let num = Number(v);
                      if (Number.isNaN(num)) num = 0;
                      if (assignmentPoints != null && num > assignmentPoints) num = assignmentPoints;
                      if (num < 0) num = 0;
                      setGradeInputs(prev => ({ ...prev, [submission.id]: String(num) }));
                    }}
                    className="w-24 px-2 py-1 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
                  />
                  <button onClick={() => verifySubmission(submission.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">
                    Verify
                  </button>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  {submission.points_earned !== null ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                  )}
                  {submission.points_earned !== null ? 'Verified' : 'Pending'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
