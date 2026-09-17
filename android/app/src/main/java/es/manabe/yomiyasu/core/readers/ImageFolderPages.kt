package es.manabe.yomiyasu.core.readers

import es.manabe.yomiyasu.core.mokuro.MokuroBook
import es.manabe.yomiyasu.core.mokuro.MokuroPage
import es.manabe.yomiyasu.core.mokuro.MokuroSize

/**
 * Construye las páginas de un tomo sin mokuro (carpeta de imágenes) a partir
 * de la lista de imágenes que devuelve el backend. Se reutiliza [MokuroPage]
 * sin cajas de texto: los spreads, el progreso y el pager funcionan igual que
 * con un tomo de mokuro y la vista usa [ImagePageView].
 */
object ImageFolderPages {
    /**
     * Ruta de una página relativa a la carpeta de la serie. En mokuro el
     * `imagePath` ya incluye la carpeta de imágenes (sale del html); en los
     * tomos de imágenes hay que prefijarla para que el lector y las descargas
     * usen la misma ruta (`mangas/{serie}/{imagesFolder}/{archivo}`).
     */
    fun joinedPath(imagesFolder: String?, fileName: String): String =
        if (imagesFolder.isNullOrEmpty()) fileName else "$imagesFolder/$fileName"

    fun makeBook(pagePaths: List<String>, imagesFolder: String?): MokuroBook =
        MokuroBook(
            pages = pagePaths.mapIndexed { index, path ->
                MokuroPage(
                    id = index,
                    imagePath = joinedPath(imagesFolder, path),
                    size = MokuroSize(0f, 0f),
                    boxes = emptyList(),
                )
            },
        )
}
