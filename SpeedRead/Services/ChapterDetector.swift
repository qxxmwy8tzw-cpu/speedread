import Foundation

class ChapterDetector {
    static let shared = ChapterDetector()

    private init() {}

    private let chapterPatterns: [String] = [
        // Chapter with number
        "(?i)^\\s*(chapter|chap\\.?)\\s+(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)",
        // Part with number
        "(?i)^\\s*(part)\\s+(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)",
        // Prologue, Epilogue, etc.
        "(?i)^\\s*(prologue|epilogue|introduction|preface|foreword|afterword|conclusion)\\s*$",
        // Roman numerals
        "^\\s*([IVXLC]+)\\.?\\s*$"
    ]

    struct ChapterMatch {
        let title: String
        let range: Range<String.Index>
        let priority: Int
    }

    func detectChapters(from text: String) -> [Chapter] {
        var matches: [ChapterMatch] = []

        let lines = text.components(separatedBy: .newlines)
        var currentIndex = text.startIndex

        for line in lines {
            let trimmedLine = line.trimmingCharacters(in: .whitespaces)

            if !trimmedLine.isEmpty {
                if let chapterTitle = matchChapterPattern(trimmedLine) {
                    if let range = text.range(of: line, range: currentIndex..<text.endIndex) {
                        let priority = getPriority(for: trimmedLine)
                        matches.append(ChapterMatch(title: chapterTitle, range: range, priority: priority))
                    }
                }
            }

            // Move index forward
            if let range = text.range(of: line + "\n", range: currentIndex..<text.endIndex) {
                currentIndex = range.upperBound
            } else if let range = text.range(of: line, range: currentIndex..<text.endIndex) {
                currentIndex = range.upperBound
            }
        }

        // If no chapters found, return single chapter with all text
        if matches.isEmpty {
            let words = PDFTextExtractor.shared.extractWords(from: text)
            return [Chapter(title: "Full Text", words: words, chapterIndex: 0)]
        }

        // Create chapters from matches
        var chapters: [Chapter] = []
        let textExtractor = PDFTextExtractor.shared

        for (index, match) in matches.enumerated() {
            let startIndex = match.range.upperBound
            let endIndex = index + 1 < matches.count ? matches[index + 1].range.lowerBound : text.endIndex

            let chapterText = String(text[startIndex..<endIndex])
            let words = textExtractor.extractWords(from: chapterText)

            chapters.append(Chapter(
                title: match.title,
                words: words,
                startPage: 0,
                chapterIndex: index
            ))
        }

        return chapters
    }

    private func matchChapterPattern(_ line: String) -> String? {
        for pattern in chapterPatterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: []),
               let match = regex.firstMatch(in: line, options: [], range: NSRange(line.startIndex..., in: line)) {
                // Return the matched chapter title, cleaned up
                let matchedString = String(line[Range(match.range, in: line)!])
                return cleanChapterTitle(matchedString)
            }
        }
        return nil
    }

    private func cleanChapterTitle(_ title: String) -> String {
        title.trimmingCharacters(in: .whitespacesAndNewlines)
            .capitalized
    }

    private func getPriority(for title: String) -> Int {
        let lowercased = title.lowercased()
        if lowercased.contains("prologue") { return 0 }
        if lowercased.contains("introduction") { return 1 }
        if lowercased.contains("preface") { return 2 }
        if lowercased.contains("chapter 1") || lowercased.contains("chapter one") { return 3 }
        return 10
    }

    func findDefaultStartIndex(in chapters: [Chapter]) -> Int {
        // Priority: prologue > introduction > chapter 1 > first chapter
        if let prologueIndex = chapters.firstIndex(where: { $0.title.lowercased().contains("prologue") }) {
            return prologueIndex
        }

        if let introIndex = chapters.firstIndex(where: { $0.title.lowercased().contains("introduction") }) {
            return introIndex
        }

        if let chapter1Index = chapters.firstIndex(where: {
            $0.title.lowercased().contains("chapter 1") || $0.title.lowercased().contains("chapter one")
        }) {
            return chapter1Index
        }

        return 0
    }
}
