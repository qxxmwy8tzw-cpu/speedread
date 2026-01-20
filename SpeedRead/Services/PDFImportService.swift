import Foundation
import SwiftUI
import UniformTypeIdentifiers

class PDFImportService {
    static let shared = PDFImportService()

    private let fileManager = FileManager.default

    private init() {}

    var pdfLibraryURL: URL {
        let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let libraryURL = documentsURL.appendingPathComponent("PDFLibrary")

        if !fileManager.fileExists(atPath: libraryURL.path) {
            try? fileManager.createDirectory(at: libraryURL, withIntermediateDirectories: true)
        }

        return libraryURL
    }

    func importPDF(from sourceURL: URL) throws -> URL {
        let accessing = sourceURL.startAccessingSecurityScopedResource()
        defer {
            if accessing {
                sourceURL.stopAccessingSecurityScopedResource()
            }
        }

        let fileName = sourceURL.lastPathComponent
        var destinationURL = pdfLibraryURL.appendingPathComponent(fileName)

        // Handle duplicate file names
        var counter = 1
        while fileManager.fileExists(atPath: destinationURL.path) {
            let nameWithoutExtension = sourceURL.deletingPathExtension().lastPathComponent
            let newName = "\(nameWithoutExtension)_\(counter).pdf"
            destinationURL = pdfLibraryURL.appendingPathComponent(newName)
            counter += 1
        }

        try fileManager.copyItem(at: sourceURL, to: destinationURL)
        return destinationURL
    }

    func deletePDF(at url: URL) throws {
        if fileManager.fileExists(atPath: url.path) {
            try fileManager.removeItem(at: url)
        }
    }
}

struct DocumentPicker: UIViewControllerRepresentable {
    let onPick: (URL) -> Void

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.pdf])
        picker.delegate = context.coordinator
        picker.allowsMultipleSelection = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onPick: onPick)
    }

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let onPick: (URL) -> Void

        init(onPick: @escaping (URL) -> Void) {
            self.onPick = onPick
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first else { return }
            onPick(url)
        }
    }
}
