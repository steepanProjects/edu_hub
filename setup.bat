@echo off
echo 🚀 Setting up Lets Connect - Classroom Management System
echo ========================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js (v16 or higher) first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Create Firebase config template
echo ⚙️  Setting up configuration files...
(
echo import { initializeApp } from 'firebase/app';
echo import { getAuth } from 'firebase/auth';
echo import { getStorage } from 'firebase/storage';
echo.
echo const firebaseConfig = {
echo   // Replace with your Firebase config
echo   apiKey: "your-api-key",
echo   authDomain: "your-project.firebaseapp.com",
echo   projectId: "your-project-id",
echo   storageBucket: "your-project.appspot.com",
echo   messagingSenderId: "123456789",
echo   appId: "your-app-id"
echo };
echo.
echo const app = initializeApp(firebaseConfig^);
echo export const auth = getAuth(app^);
echo export const storage = getStorage(app^);
echo export default app;
) > src\config\firebase.example.js

REM Create Supabase config template
(
echo import { createClient } from '@supabase/supabase-js';
echo.
echo const supabaseUrl = 'your-supabase-url';
echo const supabaseKey = 'your-supabase-anon-key';
echo.
echo export const supabase = createClient(supabaseUrl, supabaseKey^);
) > src\config\supabase.example.js

echo ✅ Configuration templates created

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Configure Firebase and Supabase (see SETUP_INSTRUCTIONS.md)
echo 2. Set up the database schema (run database-schema.sql in Supabase)
echo 3. Run 'npm start' to start the development server
echo.
echo 📚 For detailed setup instructions, see SETUP_INSTRUCTIONS.md
echo 📖 For project documentation, see README.md
echo.
echo Happy coding! 🚀
pause
