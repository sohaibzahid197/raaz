import SwiftUI
import FirebaseCore
import FirebaseAppCheck

@main
struct RaazApp: App {
    init() {
        #if DEBUG
        // Debug provider for simulator/dev builds only. Register the printed token in Firebase Console > App Check.
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        #else
        // Release / TestFlight: real App Attest, so only the genuine app on a real device can call Firebase AI.
        AppCheck.setAppCheckProviderFactory(RaazAppCheckFactory())
        #endif
        FirebaseApp.configure()
    }
    var body: some Scene { WindowGroup { RootView().preferredColorScheme(.dark) } }
}

/// App Attest provider for release builds.
final class RaazAppCheckFactory: NSObject, AppCheckProviderFactory {
    func createProvider(with app: FirebaseApp) -> AppCheckProvider? { AppAttestProvider(app: app) }
}
