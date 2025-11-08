INSERT INTO public.users (id, email, full_name, role)
VALUES ('<AUTH_UID>', '<email>', '<name>', 'tutor')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- 1) Backfill tutor membership (safe to run; inserts only missing rows)
insert into public.classroom_members (classroom_id, user_id, role)
select c.id, c.tutor_id, 'tutor'
from public.classrooms c
left join public.classroom_members cm
  on cm.classroom_id = c.id and cm.user_id = c.tutor_id
where cm.id is null;

-- 2) Replace Dev INSERT policy (drop then create)
drop policy if exists "Dev: tutor member can insert assignments (no auth)" on public.assignments;

create policy "Dev: tutor member can insert assignments (no auth)"
on public.assignments for insert
with check (
  exists (
    select 1
    from public.classroom_members cm
    join public.classrooms c on c.id = cm.classroom_id
    where cm.classroom_id = public.assignments.classroom_id
      and cm.user_id = public.assignments.created_by
      and cm.role = 'tutor'
      and c.tutor_id = public.assignments.created_by
  )
);

-- 3) Dev SELECT policy
-- Option A: Wide-open read (use only in development)
drop policy if exists "Dev: anyone can read assignments" on public.assignments;

create policy "Dev: anyone can read assignments"
on public.assignments for select
using (true);

-- If you prefer tutor-only read instead of anyone:
-- drop policy if exists "Dev: tutor can read own class assignments (no auth)" on public.assignments;
-- create policy "Dev: tutor can read own class assignments (no auth)"
-- on public.assignments for select
-- using (
--   exists (
--     select 1
--     from public.classrooms c
--     where c.id = public.assignments.classroom_id
--       and c.tutor_id = public.assignments.created_by
--   )
-- );

drop policy if exists "Dev: student can insert assignment submissions (no auth)" on public.assignment_submissions;

create policy "Dev: student can insert assignment submissions (no auth)"
on public.assignment_submissions for insert
with check (
  exists (
    select 1
    from public.classroom_members cm
    join public.assignments a on a.classroom_id = cm.classroom_id
    where a.id = public.assignment_submissions.assignment_id
      and cm.user_id = public.assignment_submissions.student_id
      and cm.role = 'student'
  )
);

drop policy if exists "Dev: anyone can read assignment submissions" on public.assignment_submissions;

create policy "Dev: anyone can read assignment submissions"
on public.assignment_submissions for select
using (
  exists (
    select 1
    from public.assignments a
    where a.id = public.assignment_submissions.assignment_id
  )
);

drop policy if exists "Dev: tutor can update submissions (no auth)" on public.assignment_submissions;

create policy "Dev: tutor can update submissions (no auth)"
on public.assignment_submissions for update
using (
  exists (
    select 1
    from public.assignments a
    join public.classrooms c on c.id = a.classroom_id
    where a.id = public.assignment_submissions.assignment_id
      and c.tutor_id = public.assignment_submissions.graded_by
  )
)
with check (true);

-- =========================================
-- 0) One-time: ensure tutors are in classroom_members
-- =========================================
insert into public.classroom_members (classroom_id, user_id, role)
select c.id, c.tutor_id, 'tutor'
from public.classrooms c
left join public.classroom_members cm
  on cm.classroom_id = c.id and cm.user_id = c.tutor_id
where cm.id is null;

-- =========================================
-- 1) Assignments policies (INSERT and SELECT)
-- =========================================

-- Allow tutors (by data) to INSERT assignments without relying on auth.uid()
drop policy if exists "Dev: tutor member can insert assignments (no auth)" on public.assignments;

create policy "Dev: tutor member can insert assignments (no auth)"
on public.assignments for insert
with check (
  exists (
    select 1
    from public.classroom_members cm
    join public.classrooms c on c.id = cm.classroom_id
    where cm.classroom_id = public.assignments.classroom_id
      and cm.user_id = public.assignments.created_by
      and cm.role = 'tutor'
      and c.tutor_id = public.assignments.created_by
  )
);

-- Allow anyone to SELECT assignments (easiest for development). 
-- If you prefer tutor-only read, comment these two and use the tutor-only block below.
drop policy if exists "Dev: anyone can read assignments" on public.assignments;

create policy "Dev: anyone can read assignments"
on public.assignments for select
using (true);

/*
-- Tutor-only read alternative (commented out)
drop policy if exists "Dev: tutor can read own class assignments (no auth)" on public.assignments;

create policy "Dev: tutor can read own class assignments (no auth)"
on public.assignments for select
using (
  exists (
    select 1
    from public.classrooms c
    where c.id = public.assignments.classroom_id
      and c.tutor_id = public.assignments.created_by
  )
);
*/

-- =========================================
-- 2) Assignment Submissions policies (INSERT, SELECT, UPDATE)
-- =========================================

-- Students can INSERT their submissions for assignments in classes they are members of
drop policy if exists "Dev: student can insert assignment submissions (no auth)" on public.assignment_submissions;

create policy "Dev: student can insert assignment submissions (no auth)"
on public.assignment_submissions for insert
with check (
  exists (
    select 1
    from public.classroom_members cm
    join public.assignments a on a.classroom_id = cm.classroom_id
    where a.id = public.assignment_submissions.assignment_id
      and cm.user_id = public.assignment_submissions.student_id
      and cm.role = 'student'
  )
);

-- Anyone can read assignment submissions (so tutors and students see them)
drop policy if exists "Dev: anyone can read assignment submissions" on public.assignment_submissions;

create policy "Dev: anyone can read assignment submissions"
on public.assignment_submissions for select
using (
  exists (
    select 1
    from public.assignments a
    where a.id = public.assignment_submissions.assignment_id
  )
);

-- Tutors can UPDATE (verify/grade) submissions (without auth.uid())
-- This version trusts the client to set graded_by to the tutor's user_id.
drop policy if exists "Dev: tutor can update submissions (no auth)" on public.assignment_submissions;

create policy "Dev: tutor can update submissions (no auth)"
on public.assignment_submissions for update
using (
  exists (
    select 1
    from public.assignments a
    join public.classrooms c on c.id = a.classroom_id
    where a.id = public.assignment_submissions.assignment_id
      and c.tutor_id = public.assignment_submissions.graded_by
  )
)
with check (true);

-- 0) Ensure tutors are members (used by checks)
insert into public.classroom_members (classroom_id, user_id, role)
select c.id, c.tutor_id, 'tutor'
from public.classrooms c
left join public.classroom_members cm
  on cm.classroom_id = c.id and cm.user_id = c.tutor_id
where cm.id is null;

-- 1) Assignments (insert + select)
drop policy if exists "Dev: tutor member can insert assignments (no auth)" on public.assignments;
create policy "Dev: tutor member can insert assignments (no auth)"
on public.assignments for insert
with check (
  exists (
    select 1
    from public.classroom_members cm
    join public.classrooms c on c.id = cm.classroom_id
    where cm.classroom_id = public.assignments.classroom_id
      and cm.user_id = public.assignments.created_by
      and cm.role = 'tutor'
      and c.tutor_id = public.assignments.created_by
  )
);

drop policy if exists "Dev: anyone can read assignments" on public.assignments;
create policy "Dev: anyone can read assignments"
on public.assignments for select
using (true);

-- 2) Assignment submissions (insert + select + update verify)
drop policy if exists "Dev: student can insert assignment submissions (no auth)" on public.assignment_submissions;
create policy "Dev: student can insert assignment submissions (no auth)"
on public.assignment_submissions for insert
with check (
  exists (
    select 1
    from public.classroom_members cm
    join public.assignments a on a.classroom_id = cm.classroom_id
    where a.id = public.assignment_submissions.assignment_id
      and cm.user_id = public.assignment_submissions.student_id
      and cm.role = 'student'
  )
);

drop policy if exists "Dev: anyone can read assignment submissions" on public.assignment_submissions;
create policy "Dev: anyone can read assignment submissions"
on public.assignment_submissions for select
using (
  exists (
    select 1
    from public.assignments a
    where a.id = public.assignment_submissions.assignment_id
  )
);

drop policy if exists "Dev: tutor can update submissions (no auth)" on public.assignment_submissions;
create policy "Dev: tutor can update submissions (no auth)"
on public.assignment_submissions for update
using (
  exists (
    select 1
    from public.assignments a
    join public.classrooms c on c.id = a.classroom_id
    where a.id = public.assignment_submissions.assignment_id
      and c.tutor_id = public.assignment_submissions.graded_by
  )
)
with check (true);

-- Allow students (by data) to UPDATE their submissions without relying on auth.uid()
drop policy if exists "Dev: student can update assignment submissions (no auth)" on public.assignment_submissions;

create policy "Dev: student can update assignment submissions (no auth)"
on public.assignment_submissions for update
using (
  exists (
    select 1
    from public.classroom_members cm
    join public.assignments a on a.classroom_id = cm.classroom_id
    where a.id = public.assignment_submissions.assignment_id
      and cm.user_id = public.assignment_submissions.student_id
      and cm.role = 'student'
  )
)
with check (true);

drop policy if exists "Dev: anyone can read assignment submissions" on public.assignment_submissions;

create policy "Dev: anyone can read assignment submissions"
on public.assignment_submissions for select
using (
  exists (
    select 1
    from public.assignments a
    where a.id = public.assignment_submissions.assignment_id
  )
);

drop policy if exists "Dev: student can delete own submission (no auth)" on public.assignment_submissions;

create policy "Dev: student can delete own submission (no auth)"
on public.assignment_submissions for delete
using (
  exists (
    select 1
    from public.assignments a
    join public.classrooms c on c.id = a.classroom_id
    join public.classroom_members cm on cm.classroom_id = c.id
    where a.id = public.assignment_submissions.assignment_id
      and cm.user_id = public.assignment_submissions.student_id
      and cm.role = 'student'
  )
);

-- Allow tutors (by data) to UPDATE assignments without relying on auth.uid()
drop policy if exists "Dev: tutor member can update assignments (no auth)" on public.assignments;

create policy "Dev: tutor member can update assignments (no auth)"
on public.assignments for update
using (
  exists (
    select 1
    from public.classrooms c
    join public.classroom_members cm on cm.classroom_id = c.id
    where c.id = public.assignments.classroom_id
      and cm.user_id = public.assignments.created_by
      and cm.role = 'tutor'
      and c.tutor_id = public.assignments.created_by
  )
)
with check (true);

drop policy if exists "Dev: backend can scale submissions on assignment edit (no auth)" on public.assignment_submissions;

create policy "Dev: backend can scale submissions on assignment edit (no auth)"
on public.assignment_submissions for update
using (
  exists (
    select 1
    from public.assignments a
    join public.classrooms c on c.id = a.classroom_id
    where a.id = public.assignment_submissions.assignment_id
      and a.created_by = c.tutor_id
  )
)
with check (true);

-- Enable required extension for UUIDs (one of the two is enough)
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Create table
create table if not exists public.email_otps (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  code text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

-- Enable RLS (optional if backend uses Service Role; safe to enable anyway)
alter table public.email_otps enable row level security;

-- A permissive policy for dev; Service Role bypasses RLS in production
drop policy if exists "Service can manage email_otps" on public.email_otps;
create policy "Service can manage email_otps"
on public.email_otps for all
using (true) with check (true);

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create table if not exists public.email_otps (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  code text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.email_otps enable row level security;

drop policy if exists "Service can manage email_otps" on public.email_otps;
create policy "Service can manage email_otps"
on public.email_otps for all
using (true) with check (true);












--ttttttttttttttttttttttttttttttttttt------------------------ttttttttttt
-- 1) Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Drop existing tables in dependency order (safe for dev)
DROP TABLE IF EXISTS public.quiz_responses CASCADE;
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.quiz_options CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.assignment_submissions CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.announcement_views CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.join_requests CASCADE;
DROP TABLE IF EXISTS public.classroom_members CASCADE;
DROP TABLE IF EXISTS public.classroom_info CASCADE;
DROP TABLE IF EXISTS public.classrooms CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 3) Tables

-- Users (TEXT id to match external auth)
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('tutor', 'student')) DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classrooms
CREATE TABLE public.classrooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  security_key TEXT UNIQUE NOT NULL,
  tutor_id TEXT NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classroom members
CREATE TABLE public.classroom_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('tutor', 'student')) DEFAULT 'student',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (classroom_id, user_id)
);

-- Files
CREATE TABLE public.files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  uploaded_by TEXT REFERENCES public.users(id) NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  upload_status TEXT CHECK (upload_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  file_category TEXT CHECK (file_category IN ('document', 'assignment', 'quiz', 'announcement')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES public.users(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_id UUID REFERENCES public.files(id),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcement views
CREATE TABLE public.announcement_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (announcement_id, user_id)
);

-- Assignments
CREATE TABLE public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES public.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_id UUID REFERENCES public.files(id),
  due_date TIMESTAMPTZ,
  points_possible INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignment submissions
CREATE TABLE public.assignment_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.users(id) NOT NULL,
  file_id UUID REFERENCES public.files(id),
  submission_text TEXT,
  points_earned INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  graded_by TEXT REFERENCES public.users(id),
  UNIQUE (assignment_id, student_id)
);

-- Quizzes
CREATE TABLE public.quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES public.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_limit INTEGER,
  due_date TIMESTAMPTZ,
  points_possible INTEGER DEFAULT 100,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')) NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  file_id UUID REFERENCES public.files(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz options
CREATE TABLE public.quiz_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL
);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.users(id) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  points_earned INTEGER DEFAULT 0,
  feedback TEXT,
  graded_at TIMESTAMPTZ,
  graded_by TEXT REFERENCES public.users(id),
  UNIQUE (quiz_id, student_id)
);

-- Quiz responses
CREATE TABLE public.quiz_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.quiz_questions(id) NOT NULL,
  selected_option_id UUID REFERENCES public.quiz_options(id),
  text_response TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  feedback TEXT
);

-- Optional lightweight classroom_info
CREATE TABLE public.classroom_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  security_key TEXT UNIQUE NOT NULL,
  tutor_id TEXT NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Join requests (approval flow)
CREATE TABLE public.join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending','accepted','rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (classroom_id, student_id)
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Documents (used by UI for file uploads)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  uploaded_by TEXT REFERENCES public.users(id) NOT NULL,
  title TEXT,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Document views (who viewed which document)
CREATE TABLE IF NOT EXISTS public.document_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (document_id, user_id)
);

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_classrooms_tutor ON public.classrooms(tutor_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_user ON public.classroom_members(user_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_classroom ON public.classroom_members(classroom_id);
CREATE INDEX IF NOT EXISTS idx_files_classroom ON public.files(classroom_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON public.files(upload_status);
CREATE INDEX IF NOT EXISTS idx_files_category ON public.files(file_category);
CREATE INDEX IF NOT EXISTS idx_announcements_classroom ON public.announcements(classroom_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement ON public.announcement_views(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_user ON public.announcement_views(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON public.assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_classroom ON public.quizzes(classroom_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_due_date ON public.quizzes(due_date);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_classroom ON public.join_requests(classroom_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_student ON public.join_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON public.join_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_classroom ON public.documents(classroom_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_views_document ON public.document_views(document_id);
CREATE INDEX IF NOT EXISTS idx_document_views_user ON public.document_views(user_id);

-- 5) Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_views ENABLE ROW LEVEL SECURITY;

-- 6) Policies (with auth.uid()::text casts)

-- Users policies
CREATE POLICY "Users can read all users"
ON public.users FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.users FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (true);

-- Classrooms
CREATE POLICY "Users can view classrooms"
ON public.classrooms FOR SELECT
USING (true);

CREATE POLICY "Anyone can create classrooms"
ON public.classrooms FOR INSERT
WITH CHECK (true);

CREATE POLICY "Tutors can update their own classrooms"
ON public.classrooms FOR UPDATE
USING (tutor_id = auth.uid()::text);

CREATE POLICY "Tutors can delete their own classrooms"
ON public.classrooms FOR DELETE
USING (tutor_id = auth.uid()::text);

-- Classroom members (non-recursive)
CREATE POLICY "Users can view classroom members"
ON public.classroom_members FOR SELECT
USING (true);

CREATE POLICY "Anyone can add classroom members"
ON public.classroom_members FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can remove classroom members"
ON public.classroom_members FOR DELETE
USING (true);

CREATE POLICY "Students can leave classrooms"
ON public.classroom_members FOR DELETE
USING (user_id = auth.uid()::text);

-- Files
CREATE POLICY "Users can view files in their classrooms"
ON public.files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_members.classroom_id = public.files.classroom_id
    AND classroom_members.user_id = auth.uid()::text
  )
);

CREATE POLICY "Tutors can upload files"
ON public.files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_members.classroom_id = classroom_id
    AND classroom_members.user_id = auth.uid()::text
    AND classroom_members.role = 'tutor'
  )
);

CREATE POLICY "Tutors can update files"
ON public.files FOR UPDATE
USING (uploaded_by = auth.uid()::text);

CREATE POLICY "Tutors can delete files"
ON public.files FOR DELETE
USING (uploaded_by = auth.uid()::text);

-- Announcements
CREATE POLICY "Users can view announcements in their classrooms"
ON public.announcements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_members.classroom_id = public.announcements.classroom_id
    AND classroom_members.user_id = auth.uid()::text
  )
);

CREATE POLICY "Tutors can create announcements"
ON public.announcements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_members.classroom_id = classroom_id
    AND classroom_members.user_id = auth.uid()::text
    AND classroom_members.role = 'tutor'
  )
);

CREATE POLICY "Tutors can update their announcements"
ON public.announcements FOR UPDATE
USING (created_by = auth.uid()::text);

CREATE POLICY "Tutors can delete their announcements"
ON public.announcements FOR DELETE
USING (created_by = auth.uid()::text);

-- Announcement views
CREATE POLICY "Users can record their own views"
ON public.announcement_views FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can see announcement views in their classrooms"
ON public.announcement_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_members cm
    JOIN public.announcements a ON a.classroom_id = cm.classroom_id
    WHERE a.id = public.announcement_views.announcement_id
    AND cm.user_id = auth.uid()::text
  )
);

-- Assignments
CREATE POLICY "Users can view assignments in their classrooms"
ON public.assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_members.classroom_id = public.assignments.classroom_id
    AND classroom_members.user_id = auth.uid()::text
  )
);

CREATE POLICY "Tutors can create assignments"
ON public.assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_members.classroom_id = classroom_id
    AND classroom_members.user_id = auth.uid()::text
    AND classroom_members.role = 'tutor'
  )
);

CREATE POLICY "Tutors can update their assignments"
ON public.assignments FOR UPDATE
USING (created_by = auth.uid()::text);

CREATE POLICY "Tutors can delete their assignments"
ON public.assignments FOR DELETE
USING (created_by = auth.uid()::text);

-- Assignment submissions
CREATE POLICY "Students can submit their own assignments"
ON public.assignment_submissions FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Users can view submissions in their classrooms"
ON public.assignment_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_members cm
    JOIN public.assignments a ON a.classroom_id = cm.classroom_id
    WHERE a.id = public.assignment_submissions.assignment_id
    AND cm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Students can update their own submissions"
ON public.assignment_submissions FOR UPDATE
USING (student_id = auth.uid()::text);

CREATE POLICY "Tutors can update submissions for grading"
ON public.assignment_submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.classrooms c ON c.id = a.classroom_id
    WHERE a.id = public.assignment_submissions.assignment_id
    AND c.tutor_id = auth.uid()::text
  )
);

-- Quizzes
CREATE POLICY "Users can view quizzes in their classrooms"
ON public.quizzes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_members.classroom_id = public.quizzes.classroom_id
    AND classroom_members.user_id = auth.uid()::text
  )
);

CREATE POLICY "Tutors can create quizzes"
ON public.quizzes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_members.classroom_id = classroom_id
    AND classroom_members.user_id = auth.uid()::text
    AND classroom_members.role = 'tutor'
  )
);

CREATE POLICY "Tutors can update their quizzes"
ON public.quizzes FOR UPDATE
USING (created_by = auth.uid()::text);

CREATE POLICY "Tutors can delete their quizzes"
ON public.quizzes FOR DELETE
USING (created_by = auth.uid()::text);

-- Quiz questions
CREATE POLICY "Users can view quiz questions in their classrooms"
ON public.quiz_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.classroom_members cm ON cm.classroom_id = q.classroom_id
    WHERE q.id = public.quiz_questions.quiz_id
    AND cm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Tutors can create quiz questions"
ON public.quiz_questions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_id
    AND q.created_by = auth.uid()::text
  )
);

CREATE POLICY "Tutors can update quiz questions"
ON public.quiz_questions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = public.quiz_questions.quiz_id
    AND q.created_by = auth.uid()::text
  )
);

CREATE POLICY "Tutors can delete quiz questions"
ON public.quiz_questions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = public.quiz_questions.quiz_id
    AND q.created_by = auth.uid()::text
  )
);

-- Quiz options
CREATE POLICY "Users can view quiz options in their classrooms"
ON public.quiz_options FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    JOIN public.classroom_members cm ON cm.classroom_id = q.classroom_id
    WHERE qq.id = public.quiz_options.question_id
    AND cm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Tutors can create quiz options"
ON public.quiz_options FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = question_id
    AND q.created_by = auth.uid()::text
  )
);

CREATE POLICY "Tutors can update quiz options"
ON public.quiz_options FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = public.quiz_options.question_id
    AND q.created_by = auth.uid()::text
  )
);

CREATE POLICY "Tutors can delete quiz options"
ON public.quiz_options FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = public.quiz_options.question_id
    AND q.created_by = auth.uid()::text
  )
);

-- Quiz attempts
CREATE POLICY "Students can view their own quiz attempts"
ON public.quiz_attempts FOR SELECT
USING (student_id = auth.uid()::text);

CREATE POLICY "Tutors can view quiz attempts in their classrooms"
ON public.quiz_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = public.quiz_attempts.quiz_id
    AND q.created_by = auth.uid()::text
  )
);

CREATE POLICY "Students can create their own quiz attempts"
ON public.quiz_attempts FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Students can update their own quiz attempts"
ON public.quiz_attempts FOR UPDATE
USING (student_id = auth.uid()::text);

CREATE POLICY "Tutors can update quiz attempts for grading"
ON public.quiz_attempts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = public.quiz_attempts.quiz_id
    AND q.created_by = auth.uid()::text
  )
);

-- Quiz responses
CREATE POLICY "Students can view their own quiz responses"
ON public.quiz_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = public.quiz_responses.attempt_id
    AND qa.student_id = auth.uid()::text
  )
);

CREATE POLICY "Tutors can view quiz responses in their classrooms"
ON public.quiz_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    WHERE qa.id = public.quiz_responses.attempt_id
    AND q.created_by = auth.uid()::text
  )
);

CREATE POLICY "Students can create their own quiz responses"
ON public.quiz_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = attempt_id
    AND qa.student_id = auth.uid()::text
  )
);

CREATE POLICY "Students can update their own quiz responses"
ON public.quiz_responses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = public.quiz_responses.attempt_id
    AND qa.student_id = auth.uid()::text
  )
);

-- Join requests
CREATE POLICY "Anyone can create join requests"
ON public.join_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view join requests"
ON public.join_requests FOR SELECT
USING (true);

-- (Tutor filtering is enforced in the UI)

CREATE POLICY "Anyone can update join requests"
ON public.join_requests FOR UPDATE
USING (true);

-- (Student/tutor scoping handled by the application layer)

-- Notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid()::text);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid()::text);

-- Optional: service role can insert classrooms (backend provisioning)
DROP POLICY IF EXISTS "Service role can insert classrooms" ON public.classrooms;
CREATE POLICY "Service role can insert classrooms"
ON public.classrooms FOR INSERT
WITH CHECK (auth.role() = 'service_role');


-- Documents (permissive to match frontend usage)
CREATE POLICY "Anyone can view documents"
ON public.documents FOR SELECT
USING (true);

CREATE POLICY "Anyone can upload documents"
ON public.documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update documents"
ON public.documents FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete documents"
ON public.documents FOR DELETE
USING (true);

-- Document views (track views)
CREATE POLICY "Anyone can record document views"
ON public.document_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read document views"
ON public.document_views FOR SELECT
USING (true);

-- 7) Timestamp trigger function and triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_classrooms_updated_at
  BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_join_requests_updated_at
  BEFORE UPDATE ON public.join_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();