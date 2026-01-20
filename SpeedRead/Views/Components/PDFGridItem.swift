import SwiftUI

struct PDFGridItem: View {
    let document: PDFDocumentModel
    let onTap: () -> Void
    let onDelete: () -> Void

    @State private var showDeleteAlert = false

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                // PDF Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 100, height: 130)

                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.red)
                }

                // Title
                Text(document.displayName)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(width: 100)

                // Word count
                Text("\(document.totalWordCount) words")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            .padding(8)
        }
        .buttonStyle(PlainButtonStyle())
        .contextMenu {
            Button(role: .destructive, action: { showDeleteAlert = true }) {
                Label("Delete", systemImage: "trash")
            }
        }
        .alert("Delete PDF?", isPresented: $showDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive, action: onDelete)
        } message: {
            Text("This will permanently remove \"\(document.displayName)\" from your library.")
        }
    }
}

struct PDFGridItem_Previews: PreviewProvider {
    static var previews: some View {
        PDFGridItem(
            document: PDFDocumentModel(
                fileName: "Sample Book.pdf",
                fileURL: URL(fileURLWithPath: "/sample.pdf"),
                totalWordCount: 45000
            ),
            onTap: {},
            onDelete: {}
        )
        .padding()
    }
}
