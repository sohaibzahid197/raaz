package app.raaz.detective

import android.app.Application
import com.google.firebase.Firebase
import com.google.firebase.appcheck.appCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory
import com.google.firebase.initialize

class RaazApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Firebase.initialize(this)
        // Debug provider for the hackathon build; logs a token to register in the Firebase console.
        Firebase.appCheck.installAppCheckProviderFactory(DebugAppCheckProviderFactory.getInstance())
    }
}
