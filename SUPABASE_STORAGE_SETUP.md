# Supabase Storage Setup Guide

## 🚀 **Free Alternative to Firebase Storage**

Since Firebase Storage is asking for payment, we've switched to **Supabase Storage** which offers:
- ✅ **1GB free storage** (vs Firebase's 5GB free)
- ✅ **No credit card required**
- ✅ **Easy setup**
- ✅ **Built-in with your existing Supabase project**

## 📋 **Setup Steps:**

### 1. **Enable Storage in Supabase**
1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Create two buckets:
   - **Bucket name**: `documents`
     - **Public**: ✅ Yes (so students can view documents)
   - **Bucket name**: `submissions`
     - **Public**: ✅ Yes (so tutors can view submissions)

### 2. **Set Storage Policies**
Go to **Storage** → **Policies** and add these policies:

#### For `documents` bucket:
```sql
-- Allow authenticated users to upload documents
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to view documents
CREATE POLICY "Allow authenticated downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
```

#### For `submissions` bucket:
```sql
-- Allow authenticated users to upload submissions
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'submissions' AND auth.role() = 'authenticated');

-- Allow authenticated users to view submissions
CREATE POLICY "Allow authenticated downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'submissions' AND auth.role() = 'authenticated');
```

### 3. **Test the Setup**
1. Start your React app: `npm start`
2. Create a tutor account
3. Create a classroom
4. Try uploading a document
5. Join as a student and verify you can view/download documents

## 💡 **Benefits of Supabase Storage:**
- **No payment required** for basic usage
- **Integrated** with your existing Supabase database
- **Automatic URL generation** for uploaded files
- **Built-in security** with RLS policies
- **Easy file management** through Supabase dashboard

## 🔧 **If you encounter issues:**
1. **Check bucket names** match exactly: `documents` and `submissions`
2. **Verify policies** are created correctly
3. **Ensure buckets are public** for file access
4. **Check browser console** for any error messages

## 📊 **Storage Limits:**
- **Free tier**: 1GB storage
- **File size limit**: 50MB per file
- **Bandwidth**: 2GB/month

This should be more than enough for a classroom management system!

---

**Note**: The code has been updated to use Supabase Storage instead of Firebase Storage. No changes needed in your React application - it will automatically use Supabase Storage now.
