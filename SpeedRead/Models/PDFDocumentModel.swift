import Foundation

struct PDFDocumentModel: Identifiable, Codable {
    let id: UUID
    let fileName: String
    let fileURL: URL
    let importDate: Date
    var chapters: [Chapter]
    var totalWordCount: Int
    var lastReadChapterIndex: Int?
    var lastReadWordIndex: Int?

    init(
        id: UUID = UUID(),
        fileName: String,
        fileURL: URL,
        importDate: Date = Date(),
        chapters: [Chapter] = [],
        totalWordCount: Int = 0,
        lastReadChapterIndex: Int? = nil,
        lastReadWordIndex: Int? = nil
    ) {
        self.id = id
        self.fileName = fileName
        self.fileURL = fileURL
        self.importDate = importDate
        self.chapters = chapters
        self.totalWordCount = totalWordCount
        self.lastReadChapterIndex = lastReadChapterIndex
        self.lastReadWordIndex = lastReadWordIndex
    }

    var displayName: String {
        fileName.replacingOccurrences(of: ".pdf", with: "", options: .caseInsensitive)
    }
}
