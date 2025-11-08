import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ocxomydbvvsabtpzkwtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeG9teWRidnZzYWJ0cHprd3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MjYzOTksImV4cCI6MjA3NzMwMjM5OX0.TRkNqXuza5khc_lQbsQfRMMjPAF4w9dEj_QV3F4miyg';

export const supabase = createClient(supabaseUrl, supabaseKey);
