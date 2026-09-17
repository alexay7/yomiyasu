package es.manabe.yomiyasu.core.readers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ImageFolderPagesTest {

    @Test
    fun `paths are prefixed with the images folder without text boxes`() {
        val book = ImageFolderPages.makeBook(
            pagePaths = listOf("001.jpg", "002.jpg", "010.jpg"),
            imagesFolder = "Vol 1",
        )

        assertEquals(3, book.pages.size)
        assertEquals(listOf(0, 1, 2), book.pages.map { it.id })
        assertEquals(
            listOf("Vol 1/001.jpg", "Vol 1/002.jpg", "Vol 1/010.jpg"),
            book.pages.map { it.imagePath },
        )
        assertTrue(book.pages.all { it.boxes.isEmpty() })
    }

    @Test
    fun `joined path ignores missing folder`() {
        assertEquals("Vol 1/001.jpg", ImageFolderPages.joinedPath("Vol 1", "001.jpg"))
        assertEquals("001.jpg", ImageFolderPages.joinedPath(null, "001.jpg"))
        assertEquals("001.jpg", ImageFolderPages.joinedPath("", "001.jpg"))
    }

    @Test
    fun `image folder pages work with spreads`() {
        val book = ImageFolderPages.makeBook((1..5).map { "$it.jpg" }, "Vol 1")

        val spreads = SpreadLayout.spreads(pageCount = book.pages.size, doublePage = true, hasCover = true)

        assertEquals(listOf(0), spreads[0].pages)
        assertEquals(listOf(1, 2), spreads[1].pages)
        assertEquals(listOf(3, 4), spreads[2].pages)
    }

    @Test
    fun `empty folder makes empty book`() {
        assertTrue(ImageFolderPages.makeBook(emptyList(), null).pages.isEmpty())
    }
}
