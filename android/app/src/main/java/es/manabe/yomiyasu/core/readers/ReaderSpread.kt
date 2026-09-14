package es.manabe.yomiyasu.core.readers

data class ReaderSpread(
    val id: Int,
    val pages: List<Int>,
) {
    val firstPage: Int get() = pages.firstOrNull() ?: 0
}

object SpreadLayout {

    fun spreads(pageCount: Int, doublePage: Boolean, hasCover: Boolean): List<ReaderSpread> {
        if (pageCount <= 0) return emptyList()

        if (!doublePage || pageCount <= 1) {
            return (0 until pageCount).map { ReaderSpread(it, listOf(it)) }
        }

        val spreads = mutableListOf<ReaderSpread>()
        var index = 0

        if (hasCover) {
            spreads.add(ReaderSpread(0, listOf(0)))
            index = 1
        }

        while (index < pageCount) {
            if (index + 1 < pageCount) {
                spreads.add(ReaderSpread(spreads.size, listOf(index, index + 1)))
                index += 2
            } else {
                spreads.add(ReaderSpread(spreads.size, listOf(index)))
                index += 1
            }
        }

        return spreads
    }

    fun spreadIndex(page: Int, doublePage: Boolean, hasCover: Boolean): Int {
        if (!doublePage) return page

        return if (hasCover) {
            if (page == 0) 0 else 1 + (page - 1) / 2
        } else {
            page / 2
        }
    }
}
