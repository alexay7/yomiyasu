package es.manabe.yomiyasu.core.readers

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/** Espejo local del progreso (equivalente a los UserDefaults del iOS). */
@Singleton
class ProgressMirror @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val prefs = context.getSharedPreferences("yomiyasu_progress", Context.MODE_PRIVATE)

    fun mangaPage(bookId: String): Int = prefs.getInt("progressPage.$bookId", 0)

    fun setMangaPage(bookId: String, page: Int) {
        prefs.edit().putInt("progressPage.$bookId", page).apply()
    }

    fun mangaTime(bookId: String): Int = prefs.getInt("progressTime.$bookId", 0)

    fun setMangaTime(bookId: String, seconds: Int) {
        prefs.edit().putInt("progressTime.$bookId", seconds).apply()
    }

    fun novelCharacters(bookId: String): Int = prefs.getInt("novelProgressCharacters.$bookId", 0)

    fun setNovelCharacters(bookId: String, characters: Int) {
        prefs.edit().putInt("novelProgressCharacters.$bookId", characters).apply()
    }

    fun novelTime(bookId: String): Int = prefs.getInt("novelProgressTime.$bookId", 0)

    fun setNovelTime(bookId: String, seconds: Int) {
        prefs.edit().putInt("novelProgressTime.$bookId", seconds).apply()
    }
}
