import Foundation
import Combine

class ReadingSessionManager: ObservableObject {
    @Published var currentWordIndex: Int = 0
    @Published var wpm: Int = 250
    @Published var isPlaying: Bool = false

    private var timer: Timer?
    private var words: [String] = []
    private var onComplete: (() -> Void)?

    var timerInterval: TimeInterval {
        60.0 / Double(wpm)
    }

    var currentWord: String {
        guard currentWordIndex < words.count else { return "" }
        return words[currentWordIndex]
    }

    var totalWords: Int {
        words.count
    }

    var progress: Double {
        guard totalWords > 0 else { return 0 }
        return Double(currentWordIndex) / Double(totalWords)
    }

    var isAtEnd: Bool {
        currentWordIndex >= words.count - 1
    }

    func loadChapter(_ chapter: Chapter, startingAt wordIndex: Int = 0) {
        words = chapter.words
        currentWordIndex = min(wordIndex, max(0, words.count - 1))
        isPlaying = false
        stopTimer()
    }

    func play() {
        guard !words.isEmpty else { return }

        if isAtEnd {
            currentWordIndex = 0
        }

        isPlaying = true
        startTimer()
    }

    func pause() {
        isPlaying = false
        stopTimer()
    }

    func toggle() {
        if isPlaying {
            pause()
        } else {
            play()
        }
    }

    func restart() {
        currentWordIndex = 0
        isPlaying = false
        stopTimer()
    }

    func seekTo(_ index: Int) {
        currentWordIndex = max(0, min(index, words.count - 1))
    }

    func setWPM(_ newWPM: Int) {
        wpm = max(50, min(1000, newWPM))
        if isPlaying {
            restartTimer()
        }
    }

    func setOnComplete(_ handler: @escaping () -> Void) {
        onComplete = handler
    }

    private func startTimer() {
        stopTimer()
        timer = Timer.scheduledTimer(withTimeInterval: timerInterval, repeats: true) { [weak self] _ in
            self?.advanceWord()
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func restartTimer() {
        if isPlaying {
            startTimer()
        }
    }

    private func advanceWord() {
        if currentWordIndex < words.count - 1 {
            currentWordIndex += 1
        } else {
            pause()
            onComplete?()
        }
    }

    deinit {
        stopTimer()
    }
}
