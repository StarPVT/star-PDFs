const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const Redis = require('redis');
const RedisStore = require('connect-redis').default;
const app = express();
const port = process.env.PORT || 3000;

// Initialize Redis client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

// Configure session middleware with RedisStore
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
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

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.authenticated) {
    return next();
  }
  res.redirect('/login');
};

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login endpoint
app.use(express.urlencoded({ extended: true }));
app.post('/login', (req, res) => {
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  console.log('Received password:', req.body.password, 'Expected:', password); // Debug log
  if (req.body.password === password) {
    req.session.authenticated = true;
    res.redirect('/manage');
  } else {
    res.status(401).send('Incorrect password');
  }
});

// Management page (protected)
app.get('/manage', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manage.html'));
});

// Logout endpoint
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// List PDFs
app.get('/api/pdfs', isAuthenticated, async (req, res) => {
  try {
    const pdfDir = path.join(__dirname, 'pdfs');
    const files = await fs.readdir(pdfDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    res.json({ files: pdfFiles });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload PDF
app.post('/api/upload', isAuthenticated, upload.single('pdf'), (req, res) => {
  if (req.file) {
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
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

// Search endpoint
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});