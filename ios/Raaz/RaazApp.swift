import SwiftUI
import FirebaseCore
import FirebaseAppCheck

@main
struct RaazApp: App {
    init() {
        // Debug provider for simulator/dev builds only. Register the printed token in Firebase Console > App Check.
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        FirebaseApp.configure()
    }
    var body: some Scene { WindowGroup { RootView().preferredColorScheme(.dark) } }
}
