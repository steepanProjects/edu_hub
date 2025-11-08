#!/bin/bash

# Lets Connect - Classroom Management System Setup Script
# This script helps set up the development environment

echo "🚀 Setting up Lets Connect - Classroom Management System"
echo "========================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create environment configuration files
echo "⚙️  Setting up configuration files..."

# Firebase config template
cat > src/config/firebase.example.js << 'EOF'
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Replace with your Firebase config
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
EOF

# Supabase config template
cat > src/config/supabase.example.js << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'your-supabase-url';
const supabaseKey = 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
EOF

echo "✅ Configuration templates created"

# Create Firebase Storage rules file
cat > firebase-storage.rules << 'EOF'
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /documents/{classroomId}/{fileName} {
      allow read, write: if request.auth != null;
    }
    match /submissions/{assignmentId}/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
EOF

echo "✅ Firebase Storage rules file created"

# Create setup instructions
cat > SETUP_INSTRUCTIONS.md << 'EOF'
# Setup Instructions for Lets Connect

## 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication (Email/Password)
4. Enable Storage
5. Get your Firebase configuration
6. Copy `src/config/firebase.example.js` to `src/config/firebase.js`
7. Update `src/config/firebase.js` with your Firebase config

## 2. Supabase Configuration

1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Go to Settings > API
4. Copy your project URL and anon key
5. Copy `src/config/supabase.example.js` to `src/config/supabase.js`
6. Update `src/config/supabase.js` with your Supabase credentials

## 3. Database Setup

1. In your Supabase project, go to SQL Editor
2. Copy the contents of `database-schema.sql`
3. Run the SQL script to create all necessary tables and policies

## 4. Firebase Storage Rules

1. In Firebase Console, go to Storage > Rules
2. Copy the contents of `firebase-storage.rules`
3. Deploy the rules

## 5. Run the Application

```bash
npm start
```

The application will open at `http://localhost:3000`

## 6. Test the Application

1. Create a tutor account
2. Create a classroom
3. Share the security key with students
4. Create a student account
5. Join the classroom using the security key
6. Test document upload, assignments, and quizzes

## Troubleshooting

- Make sure all environment variables are properly set
- Check browser console for any errors
- Verify Firebase and Supabase configurations
- Ensure database schema is properly set up
EOF

echo "✅ Setup instructions created"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure Firebase and Supabase (see SETUP_INSTRUCTIONS.md)"
echo "2. Set up the database schema (run database-schema.sql in Supabase)"
echo "3. Run 'npm start' to start the development server"
echo ""
echo "📚 For detailed setup instructions, see SETUP_INSTRUCTIONS.md"
echo "📖 For project documentation, see README.md"
echo ""
echo "Happy coding! 🚀"
