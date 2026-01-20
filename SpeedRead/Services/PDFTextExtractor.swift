import Foundation
import PDFKit

class PDFTextExtractor {
    static let shared = PDFTextExtractor()

    private init() {}

    func extractText(from url: URL) -> String? {
        guard let document = PDFDocument(url: url) else { return nil }

        var fullText = ""

        for pageIndex in 0..<document.pageCount {
            if let page = document.page(at: pageIndex),
               let pageText = page.string {
                fullText += pageText + "\n"
            }
        }

        return fullText.isEmpty ? nil : fullText
    }

    func extractWords(from text: String) -> [String] {
        let cleanedText = cleanText(text)
        let words = cleanedText.components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
        return words
    }

    private func cleanText(_ text: String) -> String {
        var cleaned = text

        // Replace multiple whitespace with single space
        cleaned = cleaned.replacingOccurrences(
            of: "\\s+",
            with: " ",
            options: .regularExpression
        )

        // Remove excessive line breaks
        cleaned = cleaned.replacingOccurrences(
            of: "\n{3,}",
            with: "\n\n",
            options: .regularExpression
        )

        return cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
