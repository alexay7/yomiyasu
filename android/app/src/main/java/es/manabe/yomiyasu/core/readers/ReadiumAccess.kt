package es.manabe.yomiyasu.core.readers

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.util.asset.AssetRetriever
import org.readium.r2.shared.util.http.DefaultHttpClient
import org.readium.r2.streamer.PublicationOpener
import org.readium.r2.streamer.parser.epub.EpubParser
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReadiumAccess @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val httpClient = DefaultHttpClient()

    private val assetRetriever = AssetRetriever(context.contentResolver, httpClient)

    private val publicationOpener = PublicationOpener(
        publicationParser = EpubParser(httpClient),
        contentProtections = listOf(),
    )

    suspend fun open(file: File): Publication? {
        val asset = assetRetriever.retrieve(file).getOrNull() ?: return null
        return publicationOpener.open(asset, allowUserInteraction = false).getOrNull()
    }
}
