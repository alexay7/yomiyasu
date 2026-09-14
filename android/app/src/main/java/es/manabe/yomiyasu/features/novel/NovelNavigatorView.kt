package es.manabe.yomiyasu.features.novel

import android.os.Bundle
import android.view.ActionMode
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.fragment.app.FragmentActivity
import org.json.JSONTokener
import org.readium.r2.navigator.epub.EpubNavigatorFactory
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.navigator.epub.EpubPreferences
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.util.AbsoluteUrl

private const val SEARCH_ACTION_ID = 0x596F6D69

@Composable
fun NovelNavigatorView(
    publication: Publication,
    initialLocator: Locator?,
    preferences: EpubPreferences,
    onNavigatorReady: (EpubNavigatorFragment) -> Unit,
    onSelectionLookup: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val activity = context as? FragmentActivity
    val fragmentManager = activity?.supportFragmentManager

    val containerId = remember { View.generateViewId() }
    val tag = remember { "novel-navigator-${publication.hashCode()}" }
    val frameLayout = remember { android.widget.FrameLayout(context).apply { id = containerId } }

    AndroidView(
        factory = { frameLayout },
        modifier = modifier.fillMaxSize(),
    )

    LaunchedEffect(publication) {
        if (fragmentManager == null) return@LaunchedEffect

        val selectionCallback = object : ActionMode.Callback {
            override fun onCreateActionMode(mode: ActionMode, menu: Menu): Boolean {
                menu.add(Menu.NONE, SEARCH_ACTION_ID, Menu.NONE, "Buscar en Yomiyasu")
                return true
            }

            override fun onPrepareActionMode(mode: ActionMode, menu: Menu): Boolean = false

            override fun onActionItemClicked(mode: ActionMode, item: MenuItem): Boolean {
                if (item.itemId != SEARCH_ACTION_ID) return false

                val webView = findWebView(fragmentManager.findFragmentByTag(tag)?.view)
                webView?.evaluateJavascript("window.getSelection().toString()") { value ->
                    val text = (JSONTokener(value ?: "").nextValue() as? String).orEmpty().trim()
                    if (text.isNotEmpty() && text.length <= 30) {
                        onSelectionLookup(text)
                    }
                }

                mode.finish()
                return true
            }

            override fun onDestroyActionMode(mode: ActionMode) = Unit
        }

        val listener = object : EpubNavigatorFragment.Listener {
            override fun onExternalLinkActivated(url: AbsoluteUrl) = Unit
        }

        val configuration = EpubNavigatorFragment.Configuration().apply {
            selectionActionModeCallback = selectionCallback
        }

        val factory = EpubNavigatorFactory(
            publication = publication,
            configuration = EpubNavigatorFactory.Configuration(),
        ).createFragmentFactory(
            initialLocator,
            publication.readingOrder,
            preferences,
            listener,
            null,
            configuration,
        )

        fragmentManager.fragmentFactory = factory

        val existing = fragmentManager.findFragmentByTag(tag)
        if (existing != null) {
            fragmentManager.beginTransaction().remove(existing).commitNow()
        }

        val transaction = fragmentManager.beginTransaction()
        transaction.replace(containerId, EpubNavigatorFragment::class.java, Bundle.EMPTY, tag)
        transaction.commitNow()

        val fragment = fragmentManager.findFragmentByTag(tag) as? EpubNavigatorFragment
        fragment?.let(onNavigatorReady)
    }
}

private fun findWebView(view: View?): WebView? {
    if (view == null) return null
    if (view is WebView) return view

    if (view is ViewGroup) {
        for (index in 0 until view.childCount) {
            findWebView(view.getChildAt(index))?.let { return it }
        }
    }

    return null
}
