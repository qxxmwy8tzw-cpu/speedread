import SwiftUI

struct SpeedReaderView: View {
    let document: PDFDocumentModel
    let chapter: Chapter

    @EnvironmentObject var persistenceService: PersistenceService
    @Environment(\.dismiss) var dismiss
    @StateObject private var sessionManager = ReadingSessionManager()

    @State private var showControls = true
    @State private var wpm: Int = 250

    var body: some View {
        ZStack {
            // Black background
            Color.black.ignoresSafeArea()

            // Tap gesture layer
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showControls.toggle()
                    }
                }

            // Centered word
            FocalWordView(word: sessionManager.currentWord, fontSize: 48)

            // Controls overlay
            if showControls {
                controlsOverlay
            }
        }
        .navigationBarHidden(true)
        .statusBar(hidden: true)
        .onAppear {
            loadSession()
        }
        .onDisappear {
            saveProgress()
        }
    }

    private var controlsOverlay: some View {
        VStack {
            // Top bar
            HStack {
                Button(action: {
                    saveProgress()
                    dismiss()
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.white.opacity(0.8))
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text(chapter.title)
                        .font(.headline)
                        .foregroundColor(.white)

                    Text("\(sessionManager.currentWordIndex + 1) / \(sessionManager.totalWords)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .padding()
            .background(
                LinearGradient(
                    colors: [Color.black.opacity(0.8), Color.clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )

            Spacer()

            // Bottom controls
            VStack(spacing: 20) {
                // Progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.white.opacity(0.3))
                            .frame(height: 4)
                            .cornerRadius(2)

                        Rectangle()
                            .fill(Color.red)
                            .frame(width: geometry.size.width * sessionManager.progress, height: 4)
                            .cornerRadius(2)
                    }
                }
                .frame(height: 4)
                .padding(.horizontal)

                // Playback controls
                HStack(spacing: 40) {
                    Button(action: { sessionManager.restart() }) {
                        Image(systemName: "backward.end.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.8))
                    }

                    Button(action: { sessionManager.toggle() }) {
                        Image(systemName: sessionManager.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: 56))
                            .foregroundColor(.white)
                    }

                    Button(action: { skipForward() }) {
                        Image(systemName: "forward.end.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.8))
                    }
                }

                // WPM control
                WPMControlView(wpm: $wpm) { newWPM in
                    sessionManager.setWPM(newWPM)
                }
            }
            .padding()
            .background(
                LinearGradient(
                    colors: [Color.clear, Color.black.opacity(0.8)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
        .transition(.opacity)
    }

    private func loadSession() {
        // Load saved progress
        let progress = persistenceService.createOrGetProgress(for: document)

        // Set WPM from saved progress
        wpm = progress.wpm
        sessionManager.setWPM(progress.wpm)

        // Load chapter and start at saved position if same chapter
        let startWordIndex = progress.chapterIndex == chapter.chapterIndex ? progress.wordIndex : 0
        sessionManager.loadChapter(chapter, startingAt: startWordIndex)
    }

    private func saveProgress() {
        var progress = persistenceService.createOrGetProgress(for: document)
        progress.chapterIndex = chapter.chapterIndex
        progress.wordIndex = sessionManager.currentWordIndex
        progress.wpm = wpm
        progress.lastReadDate = Date()
        persistenceService.updateProgress(progress)
    }

    private func skipForward() {
        let newIndex = min(sessionManager.currentWordIndex + 10, sessionManager.totalWords - 1)
        sessionManager.seekTo(newIndex)
    }
}

struct SpeedReaderView_Previews: PreviewProvider {
    static var previews: some View {
        SpeedReaderView(
            document: PDFDocumentModel(
                fileName: "Sample.pdf",
                fileURL: URL(fileURLWithPath: "/sample.pdf")
            ),
            chapter: Chapter(
                title: "Chapter 1",
                words: ["The", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog"],
                chapterIndex: 0
            )
        )
        .environmentObject(PersistenceService.shared)
    }
}
