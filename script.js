async function searchPDF() {
  const searchInput = document.getElementById('searchInput').value.trim();
  const resultDiv = document.getElementById('result');

  if (!searchInput) {
    resultDiv.innerHTML = '<p class="error">Please enter a PDF name.</p>';
    return;
  }

  try {
    const response = await fetch(`/search?name=${encodeURIComponent(searchInput)}`);
    const data = await response.json();

    if (data.filePath) {
      resultDiv.innerHTML = `<p>Found: <a href="${data.filePath}" download>Download ${data.fileName}</a></p>`;
    } else {
      resultDiv.innerHTML = `<p class="error">${data.error}</p>`;
    }
  } catch (err) {
    resultDiv.innerHTML = '<p class="error">Error searching for PDF. Please try again.</p>';
  }
}