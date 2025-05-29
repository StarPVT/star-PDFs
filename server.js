const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = process.env.PORT || 3000; // Dynamic port for hosting

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Serve PDFs from the /pdfs folder securely
app.use('/pdfs', express.static('pdfs'));

// Endpoint to search for a PDF by exact name (case-insensitive, without .pdf extension)
app.get('/search', async (req, res) => {
  const query = req.query.name;
  if (!query) {
    return res.status(400).json({ error: 'Please provide a PDF name' });
  }

  try {
    const pdfDir = path.join(__dirname, 'pdfs');
    const files = await fs.readdir(pdfDir);
    const searchFile = `${query}.pdf`.toLowerCase(); // Append .pdf and convert to lowercase
    const exactMatch = files.find(file => file.toLowerCase() === searchFile);

    if (exactMatch) {
      const filePath = `/pdfs/${exactMatch}`; // Use original filename for path
      res.json({ filePath, fileName: exactMatch });
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