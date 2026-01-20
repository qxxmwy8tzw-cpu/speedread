/**
 * Speed Reader - RSVP display engine
 */
class SpeedReader {
  constructor(options = {}) {
    this.words = [];
    this.currentIndex = 0;
    this.wpm = options.wpm || 300;
    this.isPlaying = false;
    this.timer = null;

    // Callbacks
    this.onWordChange = options.onWordChange || (() => {});
    this.onProgressChange = options.onProgressChange || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onPlayStateChange = options.onPlayStateChange || (() => {});

    // WPM limits
    this.minWPM = 100;
    this.maxWPM = 1000;
    this.wpmStep = 25;
  }

  /**
   * Load text for reading
   */
  loadText(text) {
    // Split into words, filtering out empty strings
    this.words = text.split(/\s+/).filter(word => word.length > 0);
    this.currentIndex = 0;
    this.isPlaying = false;
    this.updateDisplay();
  }

  /**
   * Set the current word index
   */
  setIndex(index) {
    this.currentIndex = Math.max(0, Math.min(index, this.words.length - 1));
    this.updateDisplay();
  }

  /**
   * Calculate the optimal recognition point (ORP) for a word
   * Returns the index of the letter closest to the middle
   */
  calculateORP(word) {
    const len = word.length;
    if (len <= 1) return 0;
    // Return the middle index (rounded down for even-length words)
    return Math.floor((len - 1) / 2);
  }

  /**
   * Get the current word split into three parts for display
   */
  getWordParts(word) {
    if (!word) return { before: '', focus: '', after: '' };

    // Strip punctuation for ORP calculation but keep for display
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
    const orpIndex = this.calculateORP(cleanWord);

    // Find the actual index in the original word
    let actualIndex = 0;
    let cleanCount = 0;

    for (let i = 0; i < word.length; i++) {
      if (/[a-zA-Z0-9]/.test(word[i])) {
        if (cleanCount === orpIndex) {
          actualIndex = i;
          break;
        }
        cleanCount++;
      }
    }

    return {
      before: word.substring(0, actualIndex),
      focus: word[actualIndex] || '',
      after: word.substring(actualIndex + 1)
    };
  }

  /**
   * Update the display with current word
   */
  updateDisplay() {
    const word = this.words[this.currentIndex] || '';
    const parts = this.getWordParts(word);

    this.onWordChange(parts);

    const progress = this.words.length > 0
      ? (this.currentIndex / (this.words.length - 1)) * 100
      : 0;
    this.onProgressChange(progress);
  }

  /**
   * Play the reader
   */
  play() {
    if (this.isPlaying) return;
    if (this.currentIndex >= this.words.length - 1) {
      this.currentIndex = 0;
    }

    this.isPlaying = true;
    this.onPlayStateChange(true);
    this.scheduleNextWord();
  }

  /**
   * Pause the reader
   */
  pause() {
    this.isPlaying = false;
    this.onPlayStateChange(false);

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Toggle play/pause
   */
  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Schedule the next word
   */
  scheduleNextWord() {
    if (!this.isPlaying) return;

    const currentWord = this.words[this.currentIndex] || '';
    const delay = this.calculateDelay(currentWord);

    this.timer = setTimeout(() => {
      this.advance();
    }, delay);
  }

  /**
   * Calculate delay for current word based on WPM and word characteristics
   */
  calculateDelay(word) {
    const baseMs = 60000 / this.wpm;
    const len = word.replace(/[^a-zA-Z0-9]/g, '').length;

    // Length multiplier
    let mult;
    if (len <= 6) mult = 1.00;
    else if (len <= 8) mult = 1.10;
    else if (len <= 10) mult = 1.22;
    else if (len <= 12) mult = 1.38;
    else if (len <= 14) mult = 1.60;
    else if (len <= 16) mult = 1.85;
    else mult = 2.15;

    // High-speed steepening for len >= 9
    if (len >= 9) {
      const s = Math.max(0, Math.min((this.wpm - 300) / 500, 1));
      mult = 1 + (mult - 1) * (1 + 0.25 * s);
    }

    // Cap at 2.2x base
    const finalMs = Math.min(baseMs * mult, baseMs * 2.2);

    // Add extra time for sentence-ending punctuation
    if (/[.!?]$/.test(word)) {
      return finalMs * 1.3;
    }

    return finalMs;
  }

  /**
   * Advance to next word
   */
  advance() {
    if (this.currentIndex >= this.words.length - 1) {
      this.pause();
      this.onComplete();
      return;
    }

    this.currentIndex++;
    this.updateDisplay();

    if (this.isPlaying) {
      this.scheduleNextWord();
    }
  }

  /**
   * Go back one word
   */
  goBack() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateDisplay();
    }
  }

  /**
   * Jump forward by percentage
   */
  jumpForward(percent = 5) {
    const jump = Math.floor(this.words.length * (percent / 100));
    this.currentIndex = Math.min(this.currentIndex + jump, this.words.length - 1);
    this.updateDisplay();
  }

  /**
   * Jump backward by percentage
   */
  jumpBackward(percent = 5) {
    const jump = Math.floor(this.words.length * (percent / 100));
    this.currentIndex = Math.max(this.currentIndex - jump, 0);
    this.updateDisplay();
  }

  /**
   * Rewind by a specific number of words
   */
  rewindByWords(count) {
    this.currentIndex = Math.max(0, this.currentIndex - count);
    this.updateDisplay();
  }

  /**
   * Increase WPM
   */
  increaseWPM() {
    this.wpm = Math.min(this.wpm + this.wpmStep, this.maxWPM);
    return this.wpm;
  }

  /**
   * Decrease WPM
   */
  decreaseWPM() {
    this.wpm = Math.max(this.wpm - this.wpmStep, this.minWPM);
    return this.wpm;
  }

  /**
   * Set WPM directly
   */
  setWPM(wpm) {
    this.wpm = Math.max(this.minWPM, Math.min(wpm, this.maxWPM));
    return this.wpm;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      currentIndex: this.currentIndex,
      totalWords: this.words.length,
      wpm: this.wpm,
      isPlaying: this.isPlaying
    };
  }
}
