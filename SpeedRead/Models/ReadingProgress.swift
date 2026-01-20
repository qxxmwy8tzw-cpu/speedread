import Foundation

struct ReadingProgress: Codable {
    let documentId: UUID
    var chapterIndex: Int
    var wordIndex: Int
    var wpm: Int
    var lastReadDate: Date

    init(
        documentId: UUID,
        chapterIndex: Int = 0,
        wordIndex: Int = 0,
        wpm: Int = 250,
        lastReadDate: Date = Date()
    ) {
        self.documentId = documentId
        self.chapterIndex = chapterIndex
        self.wordIndex = wordIndex
        self.wpm = wpm
        self.lastReadDate = lastReadDate
    }
}
