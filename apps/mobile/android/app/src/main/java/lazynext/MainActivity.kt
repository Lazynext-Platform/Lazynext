package lazynext

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * Main Activity for Lazynext Mobile.
 * The UniFFI-generated Rust bindings are initialized in LazynextBridge.kt
 * during app startup, before React Native loads.
 */
class MainActivity : ReactActivity() {
    override fun getMainComponentName(): String = "LazynextMobile"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Initialize the Rust NLE engine via UniFFI bindings
        LazynextBridge.initialize(applicationContext)
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(
            this,
            mainComponentName,
            DefaultNewArchitectureEntryPoint.fabricEnabled
        )
    }
}
