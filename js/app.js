/**
 * SpeedRead PWA - Main Application Controller
 */
const App = {
  // State
  currentBook: null,
  currentChapterIndex: 0,
  reader: null,

  // DOM Elements
  elements: {},

  /**
   * Initialize the application
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.initReader();
    this.registerServiceWorker();
    this.loadLibrary();
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      // Views
      libraryView: document.getElementById('library-view'),
      chapterView: document.getElementById('chapter-view'),
      readerView: document.getElementById('reader-view'),

      // Library
      libraryGrid: document.getElementById('library-grid'),
      emptyLibrary: document.getElementById('empty-library'),
      addPdfBtn: document.getElementById('add-pdf-btn'),
      pdfInput: document.getElementById('pdf-input'),

      // Chapter view
      chapterViewTitle: document.getElementById('chapter-view-title'),
      chapterList: document.getElementById('chapter-list'),
      backToLibrary: document.getElementById('back-to-library'),
      deleteBookBtn: document.getElementById('delete-book-btn'),

      // Reader
      wordContainer: document.querySelector('.word-container'),
      wordBefore: document.getElementById('word-before'),
      wordFocus: document.getElementById('word-focus'),
      wordAfter: document.getElementById('word-after'),
      progressFill: document.getElementById('progress-fill'),
      readerControls: document.getElementById('reader-controls'),
      readerTapArea: document.getElementById('reader-tap-area'),
      closeReader: document.getElementById('close-reader'),
      playPause: document.getElementById('play-pause'),
      playIcon: document.getElementById('play-icon'),
      pauseIcon: document.getElementById('pause-icon'),
      wpmDisplay: document.getElementById('wpm-display'),
      wpmUp: document.getElementById('wpm-up'),
      wpmDown: document.getElementById('wpm-down'),

      // New navigation controls
      restartChapter: document.getElementById('restart-chapter'),
      setBookmark: document.getElementById('set-bookmark'),
      gotoBookmark: document.getElementById('goto-bookmark'),
      rewindAction: document.getElementById('rewind-action'),
      rewindSlider: document.getElementById('rewind-slider'),
      rewindDisplay: document.getElementById('rewind-display'),

      // Loading
      loadingOverlay: document.getElementById('loading-overlay'),
      loadingText: document.getElementById('loading-text')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Library events
    this.elements.addPdfBtn.addEventListener('click', () => {
      this.elements.pdfInput.click();
    });

    this.elements.pdfInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.importPDF(e.target.files[0]);
        e.target.value = ''; // Reset for same file selection
      }
    });

    // Chapter view events
    this.elements.backToLibrary.addEventListener('click', () => {
      this.showView('library');
    });

    this.elements.deleteBookBtn.addEventListener('click', () => {
      this.deleteCurrentBook();
    });

    // Reader events
    this.elements.closeReader.addEventListener('click', () => {
      this.closeReader();
    });

    this.elements.playPause.addEventListener('click', () => {
      this.reader.toggle();
    });

    this.elements.wpmUp.addEventListener('click', () => {
      const wpm = this.reader.increaseWPM();
      this.updateWPMDisplay(wpm);
      Storage.saveSettings({ wpm });
    });

    this.elements.wpmDown.addEventListener('click', () => {
      const wpm = this.reader.decreaseWPM();
      this.updateWPMDisplay(wpm);
      Storage.saveSettings({ wpm });
    });

    // Restart chapter
    this.elements.restartChapter.addEventListener('click', () => {
      this.restartChapter();
    });

    // Bookmark controls
    this.elements.setBookmark.addEventListener('click', () => {
      this.setBookmark();
    });

    // Long-press to delete bookmark
    let bookmarkPressTimer;
    this.elements.setBookmark.addEventListener('mousedown', () => {
      bookmarkPressTimer = setTimeout(() => {
        this.removeBookmark();
      }, 800);
    });
    this.elements.setBookmark.addEventListener('mouseup', () => {
      clearTimeout(bookmarkPressTimer);
    });
    this.elements.setBookmark.addEventListener('mouseleave', () => {
      clearTimeout(bookmarkPressTimer);
    });
    this.elements.setBookmark.addEventListener('touchstart', (e) => {
      bookmarkPressTimer = setTimeout(() => {
        this.removeBookmark();
        e.preventDefault();
      }, 800);
    });
    this.elements.setBookmark.addEventListener('touchend', () => {
      clearTimeout(bookmarkPressTimer);
    });

    this.elements.gotoBookmark.addEventListener('click', () => {
      this.jumpToBookmark();
    });

    // Rewind controls
    this.elements.rewindSlider.addEventListener('input', () => {
      this.elements.rewindDisplay.textContent = this.elements.rewindSlider.value;
    });

    this.elements.rewindAction.addEventListener('click', () => {
      const count = parseInt(this.elements.rewindSlider.value, 10);
      this.reader.rewindByWords(count);
      this.saveProgress();
    });

    // Tap to toggle controls
    this.elements.readerTapArea.addEventListener('click', () => {
      this.elements.readerControls.classList.toggle('hidden');
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (!this.elements.readerView.classList.contains('active')) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.reader.toggle();
          break;
        case 'ArrowRight':
          this.reader.jumpForward(5);
          break;
        case 'ArrowLeft':
          this.reader.jumpBackward(5);
          break;
        case 'ArrowUp':
          this.reader.increaseWPM();
          this.updateWPMDisplay(this.reader.wpm);
          break;
        case 'ArrowDown':
          this.reader.decreaseWPM();
          this.updateWPMDisplay(this.reader.wpm);
          break;
        case 'Escape':
          this.closeReader();
          break;
      }
    });
  },

  /**
   * Initialize the speed reader
   */
  initReader() {
    const settings = Storage.getSettings();

    this.reader = new SpeedReader({
      wpm: settings.wpm,
      onWordChange: (parts) => {
        this.elements.wordBefore.textContent = parts.before;
        this.elements.wordFocus.textContent = parts.focus;
        this.elements.wordAfter.textContent = parts.after;
        // CSS Grid handles centering - no JS positioning needed
      },
      onProgressChange: (progress) => {
        this.elements.progressFill.style.width = `${progress}%`;
      },
      onPlayStateChange: (isPlaying) => {
        this.elements.playIcon.style.display = isPlaying ? 'none' : 'block';
        this.elements.pauseIcon.style.display = isPlaying ? 'block' : 'none';
      },
      onComplete: () => {
        // Save progress at end
        if (this.currentBook) {
          Storage.saveProgress(
            this.currentBook.id,
            this.currentChapterIndex,
            this.reader.currentIndex
          );
        }
      }
    });

    this.updateWPMDisplay(settings.wpm);
  },

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('sw.js');
        console.log('Service worker registered');
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  },

  /**
   * Show a specific view
   */
  showView(viewName) {
    const views = ['library', 'chapter', 'reader'];
    views.forEach(name => {
      const el = this.elements[`${name}View`];
      if (el) {
        el.classList.toggle('active', name === viewName);
      }
    });
  },

  /**
   * Load and display library
   */
  loadLibrary() {
    const books = Storage.getBooks();
    this.renderLibrary(books);
  },

  /**
   * Render the library grid
   */
  renderLibrary(books) {
    this.elements.libraryGrid.innerHTML = '';

    if (books.length === 0) {
      this.elements.emptyLibrary.classList.remove('hidden');
      return;
    }

    this.elements.emptyLibrary.classList.add('hidden');

    books.forEach(book => {
      const item = document.createElement('div');
      item.className = 'library-item';
      item.innerHTML = `
        <div class="library-item-cover">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div class="library-item-info">
          <div class="library-item-title">${this.escapeHtml(book.title)}</div>
          <div class="library-item-chapters">${book.chapters.length} chapter${book.chapters.length !== 1 ? 's' : ''}</div>
        </div>
      `;

      item.addEventListener('click', () => {
        this.openBook(book.id);
      });

      this.elements.libraryGrid.appendChild(item);
    });
  },

  /**
   * Import a PDF file
   */
  async importPDF(file) {
    this.showLoading('Processing PDF...');

    try {
      // Extract text from PDF
      const result = await PDFExtractor.extractText(file, (page, total) => {
        this.updateLoadingText(`Extracting page ${page} of ${total}...`);
      });

      let text = result.text;

      this.updateLoadingText('Detecting chapters...');

      // Use enhanced chapter detection (with LLM if available, regex fallback)
      const chapters = await ChapterDetector.detectChaptersEnhanced(text);

      // Save to storage
      const book = Storage.addBook({
        title: result.title,
        chapters: chapters
      });

      // Refresh library
      this.loadLibrary();

      // Open the book
      this.hideLoading();
      this.openBook(book.id);

    } catch (error) {
      console.error('Error importing PDF:', error);
      alert('Failed to import PDF. Please try another file.');
      this.hideLoading();
    }
  },

  /**
   * Open a book to show chapters
   */
  openBook(bookId) {
    const book = Storage.getBook(bookId);
    if (!book) return;

    this.currentBook = book;
    this.elements.chapterViewTitle.textContent = book.title;

    this.renderChapterList(book.chapters);
    this.showView('chapter');
  },

  /**
   * Render chapter list
   */
  renderChapterList(chapters) {
    this.elements.chapterList.innerHTML = '';

    chapters.forEach((chapter, index) => {
      const hasBookmark = this.currentBook && Storage.hasBookmark(this.currentBook.id, index);
      const item = document.createElement('li');
      item.className = 'chapter-item';
      item.innerHTML = `
        <div class="chapter-item-number">${index + 1}</div>
        <div class="chapter-item-info">
          <div class="chapter-item-title">${this.escapeHtml(chapter.title)}</div>
          <div class="chapter-item-words">${chapter.wordCount.toLocaleString()} words</div>
        </div>
        ${hasBookmark ? `
          <svg class="bookmark-indicator" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        ` : ''}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;

      item.addEventListener('click', () => {
        this.startReading(index);
      });

      this.elements.chapterList.appendChild(item);
    });
  },

  /**
   * Start reading a chapter
   */
  startReading(chapterIndex) {
    if (!this.currentBook) return;

    this.currentChapterIndex = chapterIndex;
    const chapter = this.currentBook.chapters[chapterIndex];

    // Load text into reader
    this.reader.loadText(chapter.text);

    // Restore progress if available
    const progress = Storage.getProgress(this.currentBook.id, chapterIndex);
    if (progress.wordIndex > 0) {
      this.reader.setIndex(progress.wordIndex);
    }

    // Show reader
    this.showView('reader');
    this.elements.readerControls.classList.remove('hidden');

    // Update bookmark UI
    this.updateBookmarkUI();
  },

  /**
   * Close the reader
   */
  closeReader() {
    // Save progress
    if (this.currentBook) {
      Storage.saveProgress(
        this.currentBook.id,
        this.currentChapterIndex,
        this.reader.currentIndex
      );
    }

    // Pause if playing
    this.reader.pause();

    // Re-render chapter list to update bookmark indicators
    if (this.currentBook) {
      this.renderChapterList(this.currentBook.chapters);
    }

    // Return to chapter view
    this.showView('chapter');
  },

  /**
   * Delete current book
   */
  deleteCurrentBook() {
    if (!this.currentBook) return;

    if (confirm(`Delete "${this.currentBook.title}"?`)) {
      Storage.deleteBook(this.currentBook.id);
      Storage.deleteBookmarks(this.currentBook.id);
      this.currentBook = null;
      this.loadLibrary();
      this.showView('library');
    }
  },

  /**
   * Update WPM display
   */
  updateWPMDisplay(wpm) {
    this.elements.wpmDisplay.textContent = `${wpm} WPM`;
  },

  /**
   * Restart current chapter from beginning
   */
  restartChapter() {
    this.reader.setIndex(0);
    this.saveProgress();
  },

  /**
   * Set bookmark at current position
   */
  setBookmark() {
    if (!this.currentBook) return;
    Storage.saveBookmark(
      this.currentBook.id,
      this.currentChapterIndex,
      this.reader.currentIndex
    );
    this.updateBookmarkUI();
  },

  /**
   * Remove bookmark for current chapter
   */
  removeBookmark() {
    if (!this.currentBook) return;
    Storage.removeBookmark(this.currentBook.id, this.currentChapterIndex);
    this.updateBookmarkUI();
  },

  /**
   * Jump to saved bookmark position
   */
  jumpToBookmark() {
    if (!this.currentBook) return;
    const bookmark = Storage.getBookmark(this.currentBook.id, this.currentChapterIndex);
    if (bookmark) {
      this.reader.setIndex(bookmark.wordIndex);
      this.saveProgress();
    }
  },

  /**
   * Update bookmark button UI state
   */
  updateBookmarkUI() {
    if (!this.currentBook) return;
    const hasBookmark = Storage.hasBookmark(this.currentBook.id, this.currentChapterIndex);

    // Update set bookmark button (filled when bookmark exists)
    const setBookmarkSvg = this.elements.setBookmark.querySelector('svg path');
    if (setBookmarkSvg) {
      setBookmarkSvg.setAttribute('fill', hasBookmark ? 'currentColor' : 'none');
    }

    // Enable/disable goto bookmark button
    this.elements.gotoBookmark.disabled = !hasBookmark;
  },

  /**
   * Save current reading progress
   */
  saveProgress() {
    if (this.currentBook) {
      Storage.saveProgress(
        this.currentBook.id,
        this.currentChapterIndex,
        this.reader.currentIndex
      );
    }
  },

  /**
   * Show loading overlay
   */
  showLoading(text) {
    this.elements.loadingText.textContent = text;
    this.elements.loadingOverlay.classList.add('active');
  },

  /**
   * Update loading text
   */
  updateLoadingText(text) {
    this.elements.loadingText.textContent = text;
  },

  /**
   * Hide loading overlay
   */
  hideLoading() {
    this.elements.loadingOverlay.classList.remove('active');
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
