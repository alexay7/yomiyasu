import CoreGraphics

/// Construye las páginas de un tomo sin mokuro (carpeta de imágenes) a partir
/// de la lista de imágenes que devuelve el backend. Se reutiliza `MokuroBook`
/// sin cajas de texto: el resto del lector (spreads, zoom, progreso) funciona
/// igual que con un tomo de mokuro.
enum ImageFolderPages {
    /// Proporción de reserva (página de manga) hasta conocer el tamaño real.
    static let defaultPageSize = CGSize(width: 1400, height: 2000)

    /// Ruta de una página relativa a la carpeta de la serie. En mokuro el
    /// `imagePath` ya incluye la carpeta de imágenes (sale del html); en los
    /// tomos de imágenes hay que prefijarla para que el lector y las descargas
    /// usen la misma ruta (`mangas/{serie}/{imagesFolder}/{archivo}`).
    static func joinedPath(imagesFolder: String?, fileName: String) -> String {
        guard let imagesFolder, !imagesFolder.isEmpty else { return fileName }

        return "\(imagesFolder)/\(fileName)"
    }

    static func makeBook(pagePaths: [String], imagesFolder: String?, firstPageSize: CGSize?) -> MokuroBook {
        let size = firstPageSize ?? defaultPageSize

        let pages = pagePaths.enumerated().map { index, path in
            MokuroPage(
                id: index,
                imagePath: joinedPath(imagesFolder: imagesFolder, fileName: path),
                size: size,
                boxes: []
            )
        }

        return MokuroBook(pages: pages)
    }
}
