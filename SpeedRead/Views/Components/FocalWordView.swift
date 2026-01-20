import SwiftUI

struct FocalWordView: View {
    let word: String
    let fontSize: CGFloat

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(word.enumerated()), id: \.offset) { index, character in
                Text(String(character))
                    .font(.system(size: fontSize, weight: .medium, design: .monospaced))
                    .foregroundColor(index == focalIndex ? .red : .white)
            }
        }
    }

    private var focalIndex: Int {
        let length = word.count
        if length <= 1 { return 0 }
        if length <= 3 { return 0 }
        if length <= 6 { return 1 }
        return (length - 1) / 3
    }
}

struct FocalWordView_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 40) {
                FocalWordView(word: "I", fontSize: 48)
                FocalWordView(word: "to", fontSize: 48)
                FocalWordView(word: "the", fontSize: 48)
                FocalWordView(word: "hello", fontSize: 48)
                FocalWordView(word: "reading", fontSize: 48)
                FocalWordView(word: "spectacular", fontSize: 48)
            }
        }
    }
}
