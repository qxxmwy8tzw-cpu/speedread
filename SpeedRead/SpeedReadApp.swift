import SwiftUI

@main
struct SpeedReadApp: App {
    @StateObject private var persistenceService = PersistenceService.shared

    var body: some Scene {
        WindowGroup {
            LibraryView()
                .environmentObject(persistenceService)
        }
    }
}
