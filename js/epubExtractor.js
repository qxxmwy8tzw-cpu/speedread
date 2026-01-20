/**
 * EPUB Extractor - Extract text and chapters from EPUB files
 */
const EPUBExtractor = {
  /**
   * Extract text and chapters from an EPUB file
   * @param {File} file - The EPUB file
   * @param {Function} onProgress - Progress callback (current, total)
   * @returns {Promise<{title: string, chapters: Array}>}
   */
  async extract(file, onProgress = () => {}) {
    const zip = await JSZip.loadAsync(file);

    // Find container.xml to get the content.opf path
    const containerXml = await zip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) {
      throw new Error('Invalid EPUB: Missing container.xml');
    }

    // Parse container.xml to find content.opf path
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfileEl = containerDoc.querySelector('rootfile');
    const opfPath = rootfileEl?.getAttribute('full-path');

    if (!opfPath) {
      throw new Error('Invalid EPUB: Cannot find content.opf');
    }

    // Get the base directory for resolving relative paths
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

    // Parse content.opf
    const opfContent = await zip.file(opfPath)?.async('text');
    if (!opfContent) {
      throw new Error('Invalid EPUB: Cannot read content.opf');
    }

    const opfDoc = parser.parseFromString(opfContent, 'application/xml');

    // Get title
    const titleEl = opfDoc.querySelector('metadata title, title');
    const title = titleEl?.textContent || file.name.replace(/\.epub$/i, '');

    // Get spine (reading order)
    const spineItems = opfDoc.querySelectorAll('spine itemref');
    const manifest = opfDoc.querySelectorAll('manifest item');

    // Build manifest map (id -> href)
    const manifestMap = {};
    manifest.forEach(item => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      const mediaType = item.getAttribute('media-type');
      if (id && href) {
        manifestMap[id] = { href, mediaType };
      }
    });

    // Try to get TOC for chapter names
    const tocMap = await this.parseTOC(zip, opfDoc, opfDir, manifestMap);

    // Extract chapters from spine order
    const chapters = [];
    const spineArray = Array.from(spineItems);

    for (let i = 0; i < spineArray.length; i++) {
      onProgress(i + 1, spineArray.length);

      const itemref = spineArray[i];
      const idref = itemref.getAttribute('idref');
      const manifestItem = manifestMap[idref];

      if (!manifestItem || !manifestItem.mediaType?.includes('html')) {
        continue;
      }

      const filePath = opfDir + manifestItem.href;
      const content = await zip.file(filePath)?.async('text');

      if (!content) continue;

      // Extract text from HTML
      const text = this.extractTextFromHTML(content);
      if (!text || text.trim().length < 50) continue;

      // Get chapter title from TOC or generate one
      const chapterTitle = tocMap[manifestItem.href] ||
                          this.extractTitleFromHTML(content) ||
                          `Chapter ${chapters.length + 1}`;

      const words = text.split(/\s+/).filter(w => w.length > 0);

      chapters.push({
        title: chapterTitle,
        text: text,
        wordCount: words.length
      });
    }

    // If we got no chapters, try treating entire book as one chapter
    if (chapters.length === 0) {
      throw new Error('Could not extract any readable content from EPUB');
    }

    return { title, chapters };
  },

  /**
   * Parse table of contents to get chapter names
   */
  async parseTOC(zip, opfDoc, opfDir, manifestMap) {
    const tocMap = {};

    // Try NCX TOC first (EPUB 2)
    const ncxItem = opfDoc.querySelector('manifest item[media-type="application/x-dtbncx+xml"]');
    if (ncxItem) {
      const ncxHref = ncxItem.getAttribute('href');
      const ncxPath = opfDir + ncxHref;
      const ncxContent = await zip.file(ncxPath)?.async('text');

      if (ncxContent) {
        const parser = new DOMParser();
        const ncxDoc = parser.parseFromString(ncxContent, 'application/xml');
        const navPoints = ncxDoc.querySelectorAll('navPoint');

        navPoints.forEach(navPoint => {
          const label = navPoint.querySelector('navLabel text')?.textContent;
          const src = navPoint.querySelector('content')?.getAttribute('src');
          if (label && src) {
            // Remove fragment identifier
            const href = src.split('#')[0];
            tocMap[href] = label.trim();
          }
        });
      }
    }

    // Try NAV TOC (EPUB 3)
    const navItem = opfDoc.querySelector('manifest item[properties*="nav"]');
    if (navItem && Object.keys(tocMap).length === 0) {
      const navHref = navItem.getAttribute('href');
      const navPath = opfDir + navHref;
      const navContent = await zip.file(navPath)?.async('text');

      if (navContent) {
        const parser = new DOMParser();
        const navDoc = parser.parseFromString(navContent, 'application/xhtml+xml');
        const navEl = navDoc.querySelector('nav[*|type="toc"], nav#toc, nav.toc');

        if (navEl) {
          const links = navEl.querySelectorAll('a');
          links.forEach(link => {
            const label = link.textContent;
            const href = link.getAttribute('href');
            if (label && href) {
              const cleanHref = href.split('#')[0];
              tocMap[cleanHref] = label.trim();
            }
          });
        }
      }
    }

    return tocMap;
  },

  /**
   * Extract plain text from HTML content
   */
  extractTextFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove script and style elements
    doc.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove());

    // Get text content
    const body = doc.body || doc.documentElement;
    let text = body.textContent || '';

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  },

  /**
   * Try to extract a title from HTML content
   */
  extractTitleFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Try h1, h2, title in order
    const h1 = doc.querySelector('h1');
    if (h1?.textContent?.trim()) return h1.textContent.trim();

    const h2 = doc.querySelector('h2');
    if (h2?.textContent?.trim()) return h2.textContent.trim();

    const title = doc.querySelector('title');
    if (title?.textContent?.trim()) return title.textContent.trim();

    return null;
  }
};
