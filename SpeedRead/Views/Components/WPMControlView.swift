import SwiftUI

struct WPMControlView: View {
    @Binding var wpm: Int
    let onWPMChange: (Int) -> Void

    private let minWPM = 50
    private let maxWPM = 1000

    var body: some View {
        VStack(spacing: 12) {
            Text("\(wpm) WPM")
                .font(.system(size: 18, weight: .semibold, design: .monospaced))
                .foregroundColor(.white)

            HStack(spacing: 20) {
                Button(action: { adjustWPM(by: -50) }) {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.white.opacity(0.8))
                }
                .disabled(wpm <= minWPM)

                Slider(
                    value: Binding(
                        get: { Double(wpm) },
                        set: { newValue in
                            let newWPM = Int(newValue)
                            wpm = newWPM
                            onWPMChange(newWPM)
                        }
                    ),
                    in: Double(minWPM)...Double(maxWPM),
                    step: 10
                )
                .accentColor(.red)
                .frame(width: 200)

                Button(action: { adjustWPM(by: 50) }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.white.opacity(0.8))
                }
                .disabled(wpm >= maxWPM)
            }
        }
        .padding()
        .background(Color.black.opacity(0.7))
        .cornerRadius(16)
    }

    private func adjustWPM(by amount: Int) {
        let newWPM = max(minWPM, min(maxWPM, wpm + amount))
        wpm = newWPM
        onWPMChange(newWPM)
    }
}

struct WPMControlView_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            WPMControlView(wpm: .constant(250)) { _ in }
        }
    }
}
