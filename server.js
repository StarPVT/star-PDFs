const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = process.env.PORT || 3000; // Dynamic port for hosting

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Serve files from the /files folder securely
app.use('/files', express.static('files'));

// Endpoint to search for a file by exact name (case-insensitive, without extension)
app.get('/search', async (req, res) => {
  const query = req.query.name;
  if (!query) {
    return res.status(400).json({ error: 'Please provide a file name' });
  }

  try {
    const filesDir = path.join(__dirname, 'files');
    const files = await fs.readdir(filesDir);
    // Find a file where the name (without extension) matches the query case-insensitively
    const exactMatch = files.find(file => {
      const fileNameWithoutExt = path.parse(file).name.toLowerCase();
      return fileNameWithoutExt === query.toLowerCase();
    });

    if (exactMatch) {
      const filePath = `/files/${exactMatch}`; // Use original filename for path
      res.json({ filePath, fileName: exactMatch });
    } else {
      res.status(404).json({ error: 'No file found with that exact name' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});