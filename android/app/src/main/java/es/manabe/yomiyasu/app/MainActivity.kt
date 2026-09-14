package es.manabe.yomiyasu.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import es.manabe.yomiyasu.core.session.SessionStore
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : FragmentActivity() {

    @Inject
    lateinit var session: SessionStore

    override fun onCreate(savedInstanceState: Bundle?) {
        DebugConfig.applyIntentExtras(intent)

        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        lifecycleScope.launch {
            session.bootstrap()
        }

        setContent {
            AppRoot()
        }
    }
}
