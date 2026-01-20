import Foundation

struct Chapter: Identifiable, Codable {
    let id: UUID
    let title: String
    var words: [String]
    let startPage: Int
    let chapterIndex: Int

    init(
        id: UUID = UUID(),
        title: String,
        words: [String] = [],
        startPage: Int = 0,
        chapterIndex: Int
    ) {
        self.id = id
        self.title = title
        self.words = words
        self.startPage = startPage
        self.chapterIndex = chapterIndex
    }

    var wordCount: Int {
        words.count
    }
}
