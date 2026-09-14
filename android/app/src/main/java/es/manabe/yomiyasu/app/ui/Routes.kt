package es.manabe.yomiyasu.app.ui

object Routes {
    const val Home = "home"
    const val Library = "library"
    const val Readlist = "readlist"
    const val Words = "words"
    const val More = "more"
    const val History = "history"
    const val Calendar = "calendar"
    const val Stats = "stats"
    const val Downloads = "downloads"
    const val Settings = "settings"
    const val Account = "account"

    const val SeriePattern = "serie/{serieId}"
    const val BookPattern = "book/{bookId}"

    fun serie(id: String) = "serie/$id"
    fun book(id: String) = "book/$id"
}
