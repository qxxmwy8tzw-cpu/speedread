/**
 * PDF text extraction using PDF.js with structure preservation
 */
const PDFExtractor = {
  /**
   * Initialize PDF.js worker
   */
  init() {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  },

  /**
   * Extract text from a PDF file with structure preserved
   * @param {File} file - The PDF file to extract text from
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<{title: string, text: string, pageCount: number}>}
   */
  async extractText(file, progressCallback) {
    this.init();

    const arrayBuffer = await this.fileToArrayBuffer(file);
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pageCount = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= pageCount; i++) {
      if (progressCallback) {
        progressCallback(i, pageCount);
      }

      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = this.extractPageText(textContent);

      fullText += pageText + '\n\n--- PAGE BREAK ---\n\n';
    }

    // Clean up and detect structure
    fullText = this.cleanText(fullText);

    const title = this.extractTitle(file.name);

    return {
      title,
      text: fullText,
      pageCount
    };
  },

  /**
   * Extract text from a single page with structure preservation
   */
  extractPageText(textContent) {
    if (!textContent.items || textContent.items.length === 0) {
      return '';
    }

    const items = textContent.items;
    let result = '';
    let lastY = null;
    let lastX = null;
    let lastHeight = null;
    let lineText = '';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.str) continue;

      const y = item.transform[5]; // Y position
      const x = item.transform[4]; // X position
      const height = item.height || 12;

      // Detect line breaks based on Y position change
      if (lastY !== null) {
        const yDiff = Math.abs(lastY - y);
        const lineHeight = lastHeight || 12;

        if (yDiff > lineHeight * 0.5) {
          // New line detected
          if (lineText.trim()) {
            result += lineText.trim() + '\n';
          }
          lineText = '';

          // Detect paragraph break (larger Y gap)
          if (yDiff > lineHeight * 2) {
            result += '\n';
          }
        } else if (lastX !== null && x > lastX + 20) {
          // Large horizontal gap - might be tab or column
          lineText += '  ';
        }
      }

      // Add space between items if needed
      if (lineText && !lineText.endsWith(' ') && !item.str.startsWith(' ')) {
        // Check if there's a horizontal gap
        if (lastX !== null && x > lastX + 5) {
          lineText += ' ';
        }
      }

      lineText += item.str;
      lastY = y;
      lastX = x + (item.width || item.str.length * 5);
      lastHeight = height;
    }

    // Don't forget the last line
    if (lineText.trim()) {
      result += lineText.trim() + '\n';
    }

    return result;
  },

  /**
   * Convert File to ArrayBuffer
   */
  fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Clean extracted text while preserving structure
   */
  cleanText(text) {
    return text
      // Remove page break markers but keep the double newline
      .replace(/\n*--- PAGE BREAK ---\n*/g, '\n\n')
      // Fix common issues
      .replace(/\s+([.,!?;:])/g, '$1')
      // Normalize multiple spaces (but not newlines)
      .replace(/[^\S\n]+/g, ' ')
      // Normalize excessive newlines (keep max 3)
      .replace(/\n{4,}/g, '\n\n\n')
      // Clean up lines that are just spaces
      .replace(/\n +\n/g, '\n\n')
      .trim();
  },

  /**
   * Extract title from filename
   */
  extractTitle(filename) {
    return filename
      .replace(/\.pdf$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
};
