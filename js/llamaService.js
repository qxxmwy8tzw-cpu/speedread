/**
 * LlamaService - Local LLM integration via Ollama
 * Provides intelligent content detection with graceful fallback
 */
const LlamaService = {
  config: {
    endpoint: 'http://localhost:11434/api/generate',
    model: null,
    enabled: false
  },

  /**
   * Initialize the service by checking if Ollama is available
   * @returns {Promise<boolean>} Whether Ollama is available
   */
  async init() {
    try {
      console.log('LlamaService: Checking for Ollama...');
      const res = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        throw new Error(`Ollama returned status ${res.status}`);
      }

      const data = await res.json();
      const models = data.models || [];

      if (models.length === 0) {
        console.log('LlamaService: No models installed in Ollama');
        this.config.enabled = false;
        return false;
      }

      // Prefer llama models, fall back to first available
      const preferredModels = ['llama3.2', 'llama3.1', 'llama3', 'llama2', 'mistral', 'phi'];
      let selectedModel = models[0].name;

      for (const preferred of preferredModels) {
        const found = models.find(m => m.name.toLowerCase().includes(preferred));
        if (found) {
          selectedModel = found.name;
          break;
        }
      }

      this.config.model = selectedModel;
      this.config.enabled = true;
      console.log(`LlamaService: Connected! Using model: ${selectedModel}`);
      console.log(`LlamaService: Available models: ${models.map(m => m.name).join(', ')}`);

    } catch (error) {
      this.config.enabled = false;
      console.error('LlamaService: Ollama not available -', error.message, error);
      // Show visible error for debugging
      console.error('LlamaService: Full error:', error);
    }
    return this.config.enabled;
  },

  /**
   * Check if the service is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.config.enabled;
  },

  /**
   * Find where the actual reading content begins (skip front matter)
   * @param {string} text - The full document text
   * @returns {Promise<{position: number, reason: string}|null>}
   */
  async findReadingStartPoint(text) {
    if (!this.config.enabled) return null;

    const sampleText = text.substring(0, 10000);

    const prompt = `Analyze this book text and find where the main content starts. Skip:
- Title pages, copyright notices
- Table of contents
- Dedications, acknowledgments
- Publisher info

Return ONLY a JSON object with the character position where actual reading begins:
{"position": NUMBER, "reason": "brief explanation"}

If content starts immediately: {"position": 0, "reason": "starts immediately"}

Book text:
${sampleText}`;

    try {
      console.log('LlamaService: Finding reading start point...');
      const response = await this.query(prompt);
      console.log('LlamaService: Response:', response.substring(0, 200));

      const match = response.match(/\{\s*"position"\s*:\s*(\d+)[^}]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);
        console.log(`LlamaService: Start point found at ${result.position} - ${result.reason}`);
        return result;
      }
    } catch (error) {
      console.warn('LlamaService: Error finding start point:', error);
    }
    return null;
  },

  /**
   * Find logical section/chapter breaks in the text
   * @param {string} text - The full document text
   * @returns {Promise<Array<{position: number, title: string}>|null>}
   */
  async findSectionBreaks(text) {
    if (!this.config.enabled) return null;

    // Take samples from throughout the text
    const textLength = text.length;
    const sampleSize = 4000;
    const numSamples = Math.min(8, Math.ceil(textLength / 20000));
    const samples = [];

    for (let i = 0; i < numSamples; i++) {
      const offset = Math.floor((textLength / numSamples) * i);
      samples.push({
        offset,
        text: text.substring(offset, offset + sampleSize)
      });
    }

    const sampleText = samples.map(s =>
      `=== OFFSET ${s.offset} ===\n${s.text}`
    ).join('\n\n');

    const prompt = `Find chapter/section headings in this book text. Look for:
- "Chapter 1", "Chapter One", "CHAPTER I"
- "Part 1", "Part One"
- "Prologue", "Epilogue", "Introduction"
- Numbered sections

Each sample shows its character OFFSET. Add the offset to any position you find within that sample.

Return ONLY a JSON array:
[{"position": ABSOLUTE_POSITION, "title": "Chapter Title"}]

If no chapters found: []

Text samples:
${sampleText}`;

    try {
      console.log('LlamaService: Finding section breaks...');
      const response = await this.query(prompt);
      console.log('LlamaService: Section response:', response.substring(0, 300));

      // Extract JSON array from response
      const match = response.match(/\[[\s\S]*?\]/);
      if (match) {
        const sections = JSON.parse(match[0]);
        const validSections = sections.filter(s =>
          typeof s.position === 'number' &&
          typeof s.title === 'string' &&
          s.position >= 0 &&
          s.position < textLength
        );

        console.log(`LlamaService: Found ${validSections.length} sections`);
        validSections.forEach(s => console.log(`  - "${s.title}" at position ${s.position}`));

        return validSections.length > 0 ? validSections : null;
      }
    } catch (error) {
      console.warn('LlamaService: Error finding section breaks:', error);
    }
    return null;
  },

  /**
   * Make a query to the Ollama API
   * @param {string} prompt - The prompt to send
   * @returns {Promise<string>} The model's response
   */
  async query(prompt) {
    if (!this.config.enabled || !this.config.model) {
      throw new Error('LlamaService not enabled');
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 1000
        }
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '';
  }
};
