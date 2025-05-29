const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const app = express();
const port = process.env.PORT || 3000;

// Configure session middleware with memory store (simpler for now)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to false for development, true for HTTPS in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'pdfs/');
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, sanitizedName);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDFs are allowed'), false);
    }
  }
});

// Serve static files
app.use(express.static('public'));

// Serve PDFs
app.use('/pdfs', express.static('pdfs'));

// Parse URL-encoded bodies (for form data)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  console.log('Session check:', req.session); // Debug log
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/login');
};

// Root route - redirect to main site
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login page
app.get('/login', (req, res) => {
  // If already authenticated, redirect to manage
  if (req.session && req.session.authenticated) {
    return res.redirect('/manage');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login endpoint
app.post('/login', (req, res) => {
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  console.log('Login attempt - Received:', req.body.password, 'Expected:', password); // Debug log
  
  if (req.body.password === password) {
    req.session.authenticated = true;
    console.log('Login successful, session:', req.session); // Debug log
    res.redirect('/manage');
  } else {
    console.log('Login failed - incorrect password'); // Debug log
    res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login Failed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; margin-bottom: 20px; }
          .back-btn { 
            background: #667eea; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 5px; 
          }
        </style>
      </head>
      <body>
        <h1>Star Private Secondary School</h1>
        <div class="error">❌ Incorrect password. Please try again.</div>
        <a href="/login" class="back-btn">Back to Login</a>
      </body>
      </html>
    `);
  }
});

// Management page (protected)
app.get('/manage', isAuthenticated, (req, res) => {
  console.log('Serving manage page to authenticated user'); // Debug log
  res.sendFile(path.join(__dirname, 'public', 'manage.html'));
});

// Logout endpoint
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log('Session destroy error:', err);
    }
    res.redirect('/login');
  });
});

// List PDFs
app.get('/api/pdfs', isAuthenticated, async (req, res) => {
  try {
    const pdfDir = path.join(__dirname, 'pdfs');
    
    // Create pdfs directory if it doesn't exist
    try {
      await fs.access(pdfDir);
    } catch {
      await fs.mkdir(pdfDir, { recursive: true });
    }
    
    const files = await fs.readdir(pdfDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    res.json({ files: pdfFiles });
  } catch (err) {
    console.error('Error listing PDFs:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload PDF
app.post('/api/upload', isAuthenticated, upload.single('pdf'), (req, res) => {
  if (req.file) {
    console.log('File uploaded:', req.file.filename);
    res.json({ message: 'File uploaded successfully', fileName: req.file.filename });
  } else {
    res.status(400).json({ error: 'File upload failed' });
  }
});

// Delete PDF
app.delete('/api/pdf/:filename', isAuthenticated, async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'pdfs', filename);
  try {
    await fs.unlink(filePath);
    console.log('File deleted:', filename);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(404).json({ error: 'File not found' });
  }
});

// Search endpoint (for parents)
app.get('/search', async (req, res) => {
  const query = req.query.name;
  if (!query) {
    return res.status(400).json({ error: 'Please provide a PDF name' });
  }
  try {
    const pdfDir = path.join(__dirname, 'pdfs');
    const files = await fs.readdir(pdfDir);
    const searchFile = `${query}.pdf`.toLowerCase();
    const exactMatch = files.find(file => file.toLowerCase() === searchFile);
    if (exactMatch) {
      res.json({ filePath: `/pdfs/${exactMatch}`, fileName: exactMatch });
    } else {
      res.status(404).json({ error: 'No PDF found with that exact name' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create pdfs directory on startup
async function initializeDirectories() {
  const pdfDir = path.join(__dirname, 'pdfs');
  try {
    await fs.access(pdfDir);
    console.log('PDFs directory exists');
  } catch {
    await fs.mkdir(pdfDir, { recursive: true });
    console.log('Created PDFs directory');
  }
}

app.listen(port, async () => {
  await initializeDirectories();
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Admin password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
});