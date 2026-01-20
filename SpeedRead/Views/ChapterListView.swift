import SwiftUI

struct ChapterListView: View {
    let document: PDFDocumentModel
    @EnvironmentObject var persistenceService: PersistenceService
    @State private var selectedChapter: Chapter?

    var body: some View {
        List {
            ForEach(document.chapters) { chapter in
                NavigationLink(destination: SpeedReaderView(
                    document: document,
                    chapter: chapter
                )) {
                    ChapterRow(chapter: chapter, progress: getChapterProgress(chapter))
                }
            }
        }
        .navigationTitle(document.displayName)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func getChapterProgress(_ chapter: Chapter) -> Double? {
        guard let progress = persistenceService.getProgress(for: document.id),
              progress.chapterIndex == chapter.chapterIndex else {
            return nil
        }

        guard chapter.wordCount > 0 else { return nil }
        return Double(progress.wordIndex) / Double(chapter.wordCount)
    }
}

struct ChapterRow: View {
    let chapter: Chapter
    let progress: Double?

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(chapter.title)
                    .font(.headline)

                Text("\(chapter.wordCount) words")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if let progress = progress, progress > 0 {
                Text("\(Int(progress * 100))%")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(8)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ChapterListView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            ChapterListView(document: PDFDocumentModel(
                fileName: "Sample Book.pdf",
                fileURL: URL(fileURLWithPath: "/sample.pdf"),
                chapters: [
                    Chapter(title: "Prologue", words: Array(repeating: "word", count: 500), chapterIndex: 0),
                    Chapter(title: "Chapter 1", words: Array(repeating: "word", count: 2000), chapterIndex: 1),
                    Chapter(title: "Chapter 2", words: Array(repeating: "word", count: 1800), chapterIndex: 2)
                ],
                totalWordCount: 4300
            ))
            .environmentObject(PersistenceService.shared)
        }
    }
}
