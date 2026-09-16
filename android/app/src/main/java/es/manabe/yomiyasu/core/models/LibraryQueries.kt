package es.manabe.yomiyasu.core.models

data class SeriesQuery(
    val variant: LibraryVariant = LibraryVariant.All,
    val name: String? = null,
    val genre: String? = null,
    val author: String? = null,
    val sort: SortValue = SortValue.SeriesDefault,
    val status: SerieStatus? = null,
    val firstLetter: String? = null,
    val minDifficulty: Int? = null,
    val maxDifficulty: Int? = null,
    val minValoration: Int? = null,
    val maxValoration: Int? = null,
    val valorationCount: Int? = null,
    val readprogress: ProgressFilter? = null,
    val readlistOnly: Boolean = false,
    val page: Int = 1,
    val limit: Int = 25,
) {
    val isFiltering: Boolean
        get() = genre != null || author != null || status != null || minDifficulty != null ||
            maxDifficulty != null || (readprogress != null && readprogress != ProgressFilter.All) ||
            readlistOnly || firstLetter != null ||
            minValoration != null || maxValoration != null || valorationCount != null

    fun resetFilters(): SeriesQuery = copy(
        genre = null,
        author = null,
        status = null,
        firstLetter = null,
        minDifficulty = null,
        maxDifficulty = null,
        minValoration = null,
        maxValoration = null,
        valorationCount = null,
        readprogress = null,
        readlistOnly = false,
    )

    val queryItems: List<Pair<String, String>>
        get() = buildList {
            name?.takeIf { it.isNotEmpty() }?.let { add("name" to it) }
            genre?.let { add("genre" to it) }
            author?.let { add("author" to it) }
            add("sort" to sort.rawValue)
            status?.let { add("status" to it.rawValue) }
            firstLetter?.let { add("firstLetter" to it) }
            minDifficulty?.let { add("min" to it.toString()) }
            maxDifficulty?.let { add("max" to it.toString()) }
            minValoration?.let { add("valorationMin" to it.toString()) }
            maxValoration?.let { add("valorationMax" to it.toString()) }
            valorationCount?.let { add("valorationCount" to it.toString()) }
            readprogress?.takeIf { it != ProgressFilter.All && it.rawValue != null }
                ?.let { add("readprogress" to it.rawValue!!) }
            if (readlistOnly) add("readlist" to "true")
            add("page" to page.toString())
            add("limit" to limit.toString())
        }

    val alphabetQueryItems: List<Pair<String, String>>
        get() = buildList {
            genre?.let { add("genre" to it) }
            author?.let { add("author" to it) }
            status?.let { add("status" to it.rawValue) }
            minDifficulty?.let { add("min" to it.toString()) }
            maxDifficulty?.let { add("max" to it.toString()) }
            minValoration?.let { add("valorationMin" to it.toString()) }
            maxValoration?.let { add("valorationMax" to it.toString()) }
            valorationCount?.let { add("valorationCount" to it.toString()) }
        }

    val randomQueryItems: List<Pair<String, String>>
        get() = buildList {
            addAll(alphabetQueryItems.filterNot { it.first in valorationParamNames })
            readprogress?.takeIf { it != ProgressFilter.All && it.rawValue != null }
                ?.let { add("readprogress" to it.rawValue!!) }
            if (readlistOnly) add("readlist" to "true")
        }

    private companion object {
        val valorationParamNames = setOf("valorationMin", "valorationMax", "valorationCount")
    }
}

data class BooksQuery(
    val variant: LibraryVariant = LibraryVariant.All,
    val name: String? = null,
    val serie: String? = null,
    val sort: SortValue? = null,
    val status: ProgressStatus? = null,
    val page: Int? = null,
    val limit: Int? = null,
) {
    val queryItems: List<Pair<String, String>>
        get() = buildList {
            name?.takeIf { it.isNotEmpty() }?.let { add("name" to it) }
            serie?.let { add("serie" to it) }
            sort?.let { add("sort" to it.rawValue) }
            status?.let { add("status" to it.key) }
            page?.let { add("page" to it.toString()) }
            limit?.let { add("limit" to it.toString()) }
        }
}
