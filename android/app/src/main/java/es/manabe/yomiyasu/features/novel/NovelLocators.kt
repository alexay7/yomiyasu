package es.manabe.yomiyasu.features.novel

import es.manabe.yomiyasu.core.readers.NovelProgressMap
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication

fun locatorFor(
    publication: Publication,
    map: NovelProgressMap,
    characters: Int,
): Locator? {
    val location = map.location(characters = characters) ?: return null

    val link = publication.readingOrder.firstOrNull {
        val candidate = it.href.toString()
        candidate == location.first ||
            candidate.endsWith(location.first) ||
            location.first.endsWith(candidate)
    } ?: publication.readingOrder.firstOrNull() ?: return null

    val url = publication.url(link) ?: return null

    return Locator(
        href = url,
        mediaType = link.mediaType ?: org.readium.r2.shared.util.mediatype.MediaType.XHTML,
        locations = Locator.Locations(progression = location.second),
    )
}
