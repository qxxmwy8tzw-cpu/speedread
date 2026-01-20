/**
 * Chapter detection from extracted text
 */
const ChapterDetector = {
  // Chapter heading patterns - more flexible matching
  patterns: [
    // "Chapter 1", "Chapter One", "CHAPTER I", "Chapter 1:", "Chapter 1 -"
    /\bchapter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|[ivxlc]+)\b[\s:\-]*/i,
    // "Part 1", "Part One", "PART I"
    /\bpart\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|[ivxlc]+)\b[\s:\-]*/i,
    // "Prologue", "Epilogue", "Interlude", etc. (not Introduction - too many false positives)
    /\b(prologue|epilogue|interlude|preface|foreword|afterword|conclusion)\b/i,
    // "Book 1", "Book One"
    /\bbook\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|[ivxlc]+)\b[\s:\-]*/i,
    // "Section 1"
    /\bsection\s+(\d+)\b[\s:\-]*/i,
    // Standalone Roman numerals as part markers (e.g., "I:", "II:", "III:") - only valid numerals I-XV
    /^[ \t]*(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV)\s*:/im,
    // Just numbers at start of potential heading context (e.g., "1." or "1 ")
    /^\s*(\d{1,2})\s*[\.\)]\s+/
  ],

  /**
   * Detect chapters in the given text
   * @param {string} text - The full text to analyze
   * @returns {Array<{title: string, text: string, wordCount: number}>}
   */
  detectChapters(text) {
    // Try multiple detection strategies
    let chapters = this.detectByPatterns(text);

    // If we only got one chapter, try splitting by common separators
    if (chapters.length <= 1) {
      chapters = this.detectByLargeGaps(text);
    }

    // If still just one, try detecting by page-like breaks
    if (chapters.length <= 1) {
      chapters = this.detectByPageBreaks(text);
    }

    // Filter out very small chapters (likely false positives)
    chapters = chapters.filter(ch => ch.wordCount >= 50);

    // If no chapters found or all filtered out, create one from all text
    if (chapters.length === 0) {
      chapters = [{
        title: 'Full Text',
        text: text.trim(),
        wordCount: this.countWords(text)
      }];
    }

    return chapters;
  },

  /**
   * Detect chapters using regex patterns
   */
  detectByPatterns(text) {
    const chapters = [];

    // Pattern to find chapter markers with their full titles
    // Matches: PROLOGUE: Title, CHAPTER ONE: Title, I: Title (Roman numerals), etc.
    // Note: Longer number words must come before shorter ones (SIXTEEN before SIX)
    // Note: Standalone Roman numerals require a colon (to avoid false positives)
    const combinedPattern = /^[ \t]*((?:PROLOGUE|EPILOGUE|INTERLUDE|PREFACE|FOREWORD|AFTERWORD|CONCLUSION|CHAPTER\s+(?:THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY|ELEVEN|TWELVE|THREE|SEVEN|EIGHT|FOUR|FIVE|NINE|ONE|TWO|SIX|TEN|\d+|[IVXLC]+)\b|PART\s+(?:THREE|SEVEN|EIGHT|FOUR|FIVE|NINE|ONE|TWO|SIX|TEN|\d+|[IVXLC]+)\b|BOOK\s+(?:\d+|[IVXLC]+)|SECTION\s+\d+))[ \t]*:?[ \t]*(.*?)$|^[ \t]*((?:I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV))[ \t]*:[ \t]*(.*?)$/gim;

    const matches = [];
    let match;

    while ((match = combinedPattern.exec(text)) !== null) {
      // Check if this looks like a real chapter heading
      // by looking at surrounding context
      const before = text.substring(Math.max(0, match.index - 50), match.index);

      // A chapter heading usually has whitespace/punctuation before it
      // and isn't in the middle of a sentence
      const beforeEndsClean = /[\s\.\!\?\n]$/.test(before) || before.length === 0;
      const isLikelyHeading = beforeEndsClean || /^\s*$/.test(before.slice(-10));

      // The matched line should be relatively short (chapter headings are typically < 80 chars)
      const matchedLine = match[0].trim();
      const isShortEnough = matchedLine.length < 80;

      if (isLikelyHeading && isShortEnough) {
        // Handle two alternatives in the regex:
        // Groups 1,2 for keywords (PROLOGUE, CHAPTER, etc.)
        // Groups 3,4 for standalone Roman numerals
        const sectionType = (match[1] || match[3] || '').trim();
        const titlePart = (match[2] || match[4] || '').trim();
        const fullTitle = titlePart ? `${sectionType}: ${titlePart}` : sectionType;

        matches.push({
          title: fullTitle,
          index: match.index
        });
      }
    }

    // Convert matches to chapters
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
      const chapterText = text.substring(start, end).trim();

      // Remove the chapter heading from the text
      const textWithoutHeading = chapterText.replace(/^[^\n]*/, '').trim();

      chapters.push({
        title: this.formatChapterTitle(matches[i].title),
        text: textWithoutHeading || chapterText,
        wordCount: this.countWords(textWithoutHeading || chapterText)
      });
    }

    // If there's content before the first chapter marker, add it
    if (matches.length > 0 && matches[0].index > 100) {
      const preText = text.substring(0, matches[0].index).trim();
      if (this.countWords(preText) >= 50) {
        chapters.unshift({
          title: 'Beginning',
          text: preText,
          wordCount: this.countWords(preText)
        });
      }
    }

    return chapters;
  },

  /**
   * Detect chapters by looking for large gaps (multiple newlines or whitespace)
   */
  detectByLargeGaps(text) {
    // Split by multiple newlines or large whitespace gaps
    const parts = text.split(/\n\s*\n\s*\n+/);

    if (parts.length < 2) {
      return [];
    }

    return parts.map((part, index) => {
      const trimmed = part.trim();
      // Try to extract a title from the first line
      const firstLine = trimmed.split(/\n/)[0].trim();
      const title = firstLine.length < 60 ? firstLine : `Section ${index + 1}`;

      return {
        title: title,
        text: trimmed,
        wordCount: this.countWords(trimmed)
      };
    }).filter(ch => ch.wordCount >= 50);
  },

  /**
   * Detect by page break patterns (form feeds, multiple dashes, etc.)
   */
  detectByPageBreaks(text) {
    // Common page/section separators
    const parts = text.split(/\f|(?:\r?\n[-=*]{3,}\r?\n)|(?:\r?\n\s*\*\s*\*\s*\*\s*\r?\n)/);

    if (parts.length < 2) {
      return [];
    }

    return parts.map((part, index) => {
      const trimmed = part.trim();
      return {
        title: `Section ${index + 1}`,
        text: trimmed,
        wordCount: this.countWords(trimmed)
      };
    }).filter(ch => ch.wordCount >= 50);
  },

  /**
   * Format chapter title for display
   */
  formatChapterTitle(match) {
    // Handle titles with colons (e.g., "PROLOGUE: THE BOY WHO STOLE TOO MUCH")
    const parts = match.split(':');
    if (parts.length >= 2) {
      const sectionType = parts[0].trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      const title = parts.slice(1).join(':').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      return title ? `${sectionType}: ${title}` : sectionType;
    }
    return match
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Count words in text
   */
  countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  },

  /**
   * Find the default starting chapter (prologue or chapter 1)
   */
  findDefaultChapter(chapters) {
    // First, look for Prologue
    const prologueIndex = chapters.findIndex(ch =>
      /prologue/i.test(ch.title)
    );
    if (prologueIndex !== -1) return prologueIndex;

    // Then look for Chapter 1 or first Chapter
    const chapter1Index = chapters.findIndex(ch =>
      /chapter\s+(1|one|i)\b/i.test(ch.title)
    );
    if (chapter1Index !== -1) return chapter1Index;

    // Fall back to first chapter
    return 0;
  },

  /**
   * Enhanced chapter detection - uses regex patterns
   * LLM is only used for finding reading start point, not chapters
   * @param {string} text - The full text to analyze
   * @returns {Promise<Array<{title: string, text: string, wordCount: number}>>}
   */
  async detectChaptersEnhanced(text) {
    // Use regex-based detection (fast and reliable for standard headings)
    return this.detectChapters(text);
  },

  /**
   * Convert LLM-detected sections to chapter format
   * @param {string} text - The full text
   * @param {Array<{position: number, title: string}>} sections - LLM-detected sections
   * @returns {Array<{title: string, text: string, wordCount: number}>}
   */
  convertLLMSectionsToChapters(text, sections) {
    // Sort sections by position
    const sorted = [...sections].sort((a, b) => a.position - b.position);
    const chapters = [];

    for (let i = 0; i < sorted.length; i++) {
      const start = sorted[i].position;
      const end = i < sorted.length - 1 ? sorted[i + 1].position : text.length;
      const chapterText = text.substring(start, end).trim();

      // Skip very small sections
      const wordCount = this.countWords(chapterText);
      if (wordCount < 50) continue;

      chapters.push({
        title: this.formatChapterTitle(sorted[i].title) || `Section ${i + 1}`,
        text: chapterText,
        wordCount: wordCount
      });
    }

    // If there's significant content before the first section, add it
    if (sorted.length > 0 && sorted[0].position > 100) {
      const preText = text.substring(0, sorted[0].position).trim();
      const preWordCount = this.countWords(preText);
      if (preWordCount >= 50) {
        chapters.unshift({
          title: 'Beginning',
          text: preText,
          wordCount: preWordCount
        });
      }
    }

    return chapters;
  }
};
