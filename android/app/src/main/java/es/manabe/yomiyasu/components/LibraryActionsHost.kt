package es.manabe.yomiyasu.components

import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import es.manabe.yomiyasu.core.services.DownloadManager
import es.manabe.yomiyasu.core.services.LibraryActions
import es.manabe.yomiyasu.core.services.StaticUrls

@EntryPoint
@InstallIn(SingletonComponent::class)
interface LibraryEntryPoint {
    fun libraryActions(): LibraryActions
    fun staticUrls(): StaticUrls
    fun downloadManager(): DownloadManager
}

class LibraryActionsHost(
    val actions: LibraryActions,
    val staticUrls: StaticUrls,
    val downloads: DownloadManager,
) {
    val downloadRecords: Map<String, es.manabe.yomiyasu.core.services.DownloadRecord>
        get() = downloads.records.value
}

@Composable
fun rememberLibraryActions(snackbarHostState: SnackbarHostState): LibraryActionsHost {
    val context = LocalContext.current

    val host = remember {
        val entryPoint = EntryPointAccessors.fromApplication(
            context.applicationContext,
            LibraryEntryPoint::class.java,
        )
        LibraryActionsHost(
            actions = entryPoint.libraryActions(),
            staticUrls = entryPoint.staticUrls(),
            downloads = entryPoint.downloadManager(),
        )
    }

    LaunchedEffect(host) {
        host.actions.errors.collect { message ->
            snackbarHostState.showSnackbar(message)
        }
    }

    return host
}

@Composable
fun rememberStaticUrls(): StaticUrls {
    val context = LocalContext.current
    return remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            LibraryEntryPoint::class.java,
        ).staticUrls()
    }
}
