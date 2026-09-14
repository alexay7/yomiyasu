import Foundation

enum StaticURLs {
    static func url(path: String, baseURL: URL) -> URL {
        var url = baseURL.appending(path: "api/static")

        for component in path.split(separator: "/") {
            url.appendPathComponent(String(component))
        }

        return url
    }

    static func serieCover(_ serie: Serie, baseURL: URL) -> URL? {
        guard let thumbnailPath = serie.thumbnailPath else { return nil }
        let folder = serie.variant == .novela ? "novelas" : "mangas"
        return url(path: "\(folder)/\(thumbnailPath)", baseURL: baseURL)
    }

    static func bookCover(_ book: Book, baseURL: URL) -> URL? {
        guard let seriePath = book.seriePath, let thumbnailPath = book.thumbnailPath else {
            return nil
        }

        switch book.variant {
        case .novela:
            if book.isMokured, let imagesFolder = book.imagesFolder {
                return url(path: "novelas/\(seriePath)/\(imagesFolder)/\(thumbnailPath)", baseURL: baseURL)
            }
            return url(path: "novelas/\(seriePath)/\(thumbnailPath)", baseURL: baseURL)
        default:
            guard let imagesFolder = book.imagesFolder else { return nil }
            return url(path: "mangas/\(seriePath)/\(imagesFolder)/\(thumbnailPath)", baseURL: baseURL)
        }
    }
}
