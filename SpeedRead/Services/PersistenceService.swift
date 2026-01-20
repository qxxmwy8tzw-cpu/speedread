import Foundation

class PersistenceService: ObservableObject {
    static let shared = PersistenceService()

    @Published var documents: [PDFDocumentModel] = []
    @Published var progressMap: [UUID: ReadingProgress] = [:]

    private let fileManager = FileManager.default
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    private var documentsFileURL: URL {
        let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return documentsURL.appendingPathComponent("documents.json")
    }

    private var progressFileURL: URL {
        let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return documentsURL.appendingPathComponent("progress.json")
    }

    private init() {
        loadDocuments()
        loadProgress()
    }

    // MARK: - Documents

    func loadDocuments() {
        guard fileManager.fileExists(atPath: documentsFileURL.path),
              let data = try? Data(contentsOf: documentsFileURL),
              let decoded = try? decoder.decode([PDFDocumentModel].self, from: data) else {
            documents = []
            return
        }
        documents = decoded
    }

    func saveDocuments() {
        guard let data = try? encoder.encode(documents) else { return }
        try? data.write(to: documentsFileURL)
    }

    func addDocument(_ document: PDFDocumentModel) {
        documents.append(document)
        saveDocuments()
    }

    func updateDocument(_ document: PDFDocumentModel) {
        if let index = documents.firstIndex(where: { $0.id == document.id }) {
            documents[index] = document
            saveDocuments()
        }
    }

    func deleteDocument(_ document: PDFDocumentModel) {
        documents.removeAll { $0.id == document.id }
        progressMap.removeValue(forKey: document.id)
        saveDocuments()
        saveProgress()

        // Delete the PDF file
        try? PDFImportService.shared.deletePDF(at: document.fileURL)
    }

    // MARK: - Progress

    func loadProgress() {
        guard fileManager.fileExists(atPath: progressFileURL.path),
              let data = try? Data(contentsOf: progressFileURL),
              let decoded = try? decoder.decode([UUID: ReadingProgress].self, from: data) else {
            progressMap = [:]
            return
        }
        progressMap = decoded
    }

    func saveProgress() {
        guard let data = try? encoder.encode(progressMap) else { return }
        try? data.write(to: progressFileURL)
    }

    func getProgress(for documentId: UUID) -> ReadingProgress? {
        progressMap[documentId]
    }

    func updateProgress(_ progress: ReadingProgress) {
        progressMap[progress.documentId] = progress
        saveProgress()
    }

    func createOrGetProgress(for document: PDFDocumentModel) -> ReadingProgress {
        if let existing = progressMap[document.id] {
            return existing
        }

        let defaultChapterIndex = ChapterDetector.shared.findDefaultStartIndex(in: document.chapters)
        let newProgress = ReadingProgress(
            documentId: document.id,
            chapterIndex: defaultChapterIndex,
            wordIndex: 0,
            wpm: 250
        )
        progressMap[document.id] = newProgress
        saveProgress()
        return newProgress
    }
}
