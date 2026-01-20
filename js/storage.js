/**
 * Storage module for managing localStorage persistence
 */
const Storage = {
  KEYS: {
    BOOKS: 'speedread_books',
    SETTINGS: 'speedread_settings',
    PROGRESS: 'speedread_progress',
    BOOKMARKS: 'speedread_bookmarks'
  },

  /**
   * Generate a unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Get all books from storage
   */
  getBooks() {
    try {
      const data = localStorage.getItem(this.KEYS.BOOKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading books from storage:', e);
      return [];
    }
  },

  /**
   * Save all books to storage
   */
  saveBooks(books) {
    try {
      localStorage.setItem(this.KEYS.BOOKS, JSON.stringify(books));
      return true;
    } catch (e) {
      console.error('Error saving books to storage:', e);
      // Handle quota exceeded
      if (e.name === 'QuotaExceededError') {
        alert('Storage is full. Please delete some books to free up space.');
      }
      return false;
    }
  },

  /**
   * Add a new book
   */
  addBook(book) {
    const books = this.getBooks();
    const newBook = {
      id: this.generateId(),
      title: book.title,
      chapters: book.chapters,
      addedAt: Date.now()
    };
    books.push(newBook);
    this.saveBooks(books);
    return newBook;
  },

  /**
   * Get a book by ID
   */
  getBook(id) {
    const books = this.getBooks();
    return books.find(book => book.id === id);
  },

  /**
   * Delete a book by ID
   */
  deleteBook(id) {
    const books = this.getBooks();
    const filtered = books.filter(book => book.id !== id);
    this.saveBooks(filtered);
    // Also delete progress for this book
    this.deleteProgress(id);
  },

  /**
   * Get reading progress for a book/chapter
   */
  getProgress(bookId, chapterIndex) {
    try {
      const data = localStorage.getItem(this.KEYS.PROGRESS);
      const progress = data ? JSON.parse(data) : {};
      const key = `${bookId}_${chapterIndex}`;
      return progress[key] || { wordIndex: 0 };
    } catch (e) {
      console.error('Error reading progress:', e);
      return { wordIndex: 0 };
    }
  },

  /**
   * Save reading progress
   */
  saveProgress(bookId, chapterIndex, wordIndex) {
    try {
      const data = localStorage.getItem(this.KEYS.PROGRESS);
      const progress = data ? JSON.parse(data) : {};
      const key = `${bookId}_${chapterIndex}`;
      progress[key] = { wordIndex, savedAt: Date.now() };
      localStorage.setItem(this.KEYS.PROGRESS, JSON.stringify(progress));
    } catch (e) {
      console.error('Error saving progress:', e);
    }
  },

  /**
   * Delete all progress for a book
   */
  deleteProgress(bookId) {
    try {
      const data = localStorage.getItem(this.KEYS.PROGRESS);
      if (!data) return;
      const progress = JSON.parse(data);
      // Remove all entries starting with this bookId
      Object.keys(progress).forEach(key => {
        if (key.startsWith(bookId + '_')) {
          delete progress[key];
        }
      });
      localStorage.setItem(this.KEYS.PROGRESS, JSON.stringify(progress));
    } catch (e) {
      console.error('Error deleting progress:', e);
    }
  },

  /**
   * Get app settings
   */
  getSettings() {
    try {
      const data = localStorage.getItem(this.KEYS.SETTINGS);
      return data ? JSON.parse(data) : { wpm: 300 };
    } catch (e) {
      console.error('Error reading settings:', e);
      return { wpm: 300 };
    }
  },

  /**
   * Save app settings
   */
  saveSettings(settings) {
    try {
      localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  },

  /**
   * Save a bookmark for a book/chapter
   */
  saveBookmark(bookId, chapterIndex, wordIndex) {
    try {
      const data = localStorage.getItem(this.KEYS.BOOKMARKS);
      const bookmarks = data ? JSON.parse(data) : {};
      const key = `${bookId}_${chapterIndex}`;
      bookmarks[key] = { wordIndex, timestamp: Date.now() };
      localStorage.setItem(this.KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch (e) {
      console.error('Error saving bookmark:', e);
    }
  },

  /**
   * Get bookmark for a book/chapter
   */
  getBookmark(bookId, chapterIndex) {
    try {
      const data = localStorage.getItem(this.KEYS.BOOKMARKS);
      const bookmarks = data ? JSON.parse(data) : {};
      const key = `${bookId}_${chapterIndex}`;
      return bookmarks[key] || null;
    } catch (e) {
      console.error('Error reading bookmark:', e);
      return null;
    }
  },

  /**
   * Check if a bookmark exists for a book/chapter
   */
  hasBookmark(bookId, chapterIndex) {
    return this.getBookmark(bookId, chapterIndex) !== null;
  },

  /**
   * Remove bookmark for a book/chapter
   */
  removeBookmark(bookId, chapterIndex) {
    try {
      const data = localStorage.getItem(this.KEYS.BOOKMARKS);
      if (!data) return;
      const bookmarks = JSON.parse(data);
      const key = `${bookId}_${chapterIndex}`;
      delete bookmarks[key];
      localStorage.setItem(this.KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch (e) {
      console.error('Error removing bookmark:', e);
    }
  },

  /**
   * Delete all bookmarks for a book
   */
  deleteBookmarks(bookId) {
    try {
      const data = localStorage.getItem(this.KEYS.BOOKMARKS);
      if (!data) return;
      const bookmarks = JSON.parse(data);
      Object.keys(bookmarks).forEach(key => {
        if (key.startsWith(bookId + '_')) {
          delete bookmarks[key];
        }
      });
      localStorage.setItem(this.KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch (e) {
      console.error('Error deleting bookmarks:', e);
    }
  },

  /**
   * Get storage usage info
   */
  getStorageInfo() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
      }
    }
    return {
      usedBytes: total,
      usedMB: (total / (1024 * 1024)).toFixed(2),
      estimatedLimit: '5-10 MB'
    };
  }
};
