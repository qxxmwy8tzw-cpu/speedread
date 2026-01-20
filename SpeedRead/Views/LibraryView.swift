import SwiftUI

struct LibraryView: View {
    @EnvironmentObject var persistenceService: PersistenceService
    @State private var showDocumentPicker = false
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var showError = false

    private let columns = [
        GridItem(.adaptive(minimum: 120), spacing: 16)
    ]

    var body: some View {
        NavigationStack {
            Group {
                if persistenceService.documents.isEmpty {
                    emptyState
                } else {
                    documentGrid
                }
            }
            .navigationTitle("Library")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showDocumentPicker = true }) {
                        Image(systemName: "plus")
                    }
                    .disabled(isProcessing)
                }
            }
            .sheet(isPresented: $showDocumentPicker) {
                DocumentPicker { url in
                    importPDF(from: url)
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "An unknown error occurred.")
            }
            .overlay {
                if isProcessing {
                    processingOverlay
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "books.vertical")
                .font(.system(size: 60))
                .foregroundColor(.gray)

            Text("No PDFs yet")
                .font(.title2)
                .fontWeight(.medium)

            Text("Tap the + button to import a PDF from your files.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button(action: { showDocumentPicker = true }) {
                Label("Import PDF", systemImage: "doc.badge.plus")
                    .font(.headline)
                    .padding()
                    .background(Color.red)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
        }
    }

    private var documentGrid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 20) {
                ForEach(persistenceService.documents) { document in
                    NavigationLink(destination: ChapterListView(document: document)) {
                        PDFGridItem(
                            document: document,
                            onTap: {},
                            onDelete: { deleteDocument(document) }
                        )
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding()
        }
    }

    private var processingOverlay: some View {
        ZStack {
            Color.black.opacity(0.5).ignoresSafeArea()

            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.5)
                Text("Processing PDF...")
                    .font(.headline)
                    .foregroundColor(.white)
            }
            .padding(30)
            .background(Color.gray.opacity(0.9))
            .cornerRadius(16)
        }
    }

    private func importPDF(from url: URL) {
        isProcessing = true

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                // Copy file to app storage
                let savedURL = try PDFImportService.shared.importPDF(from: url)

                // Extract text
                guard let text = PDFTextExtractor.shared.extractText(from: savedURL) else {
                    throw ImportError.textExtractionFailed
                }

                // Detect chapters
                let chapters = ChapterDetector.shared.detectChapters(from: text)

                // Calculate total word count
                let totalWordCount = chapters.reduce(0) { $0 + $1.wordCount }

                // Create document model
                let document = PDFDocumentModel(
                    fileName: savedURL.lastPathComponent,
                    fileURL: savedURL,
                    chapters: chapters,
                    totalWordCount: totalWordCount
                )

                DispatchQueue.main.async {
                    persistenceService.addDocument(document)
                    isProcessing = false
                }

            } catch {
                DispatchQueue.main.async {
                    errorMessage = error.localizedDescription
                    showError = true
                    isProcessing = false
                }
            }
        }
    }

    private func deleteDocument(_ document: PDFDocumentModel) {
        persistenceService.deleteDocument(document)
    }
}

enum ImportError: LocalizedError {
    case textExtractionFailed

    var errorDescription: String? {
        switch self {
        case .textExtractionFailed:
            return "Could not extract text from the PDF. The file may be image-based or corrupted."
        }
    }
}

struct LibraryView_Previews: PreviewProvider {
    static var previews: some View {
        LibraryView()
            .environmentObject(PersistenceService.shared)
    }
}
