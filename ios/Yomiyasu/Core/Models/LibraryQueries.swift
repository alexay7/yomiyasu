import Foundation

struct SeriesQuery: Sendable, Equatable {
    var variant: LibraryVariant = .all
    var name: String?
    var genre: String?
    var author: String?
    var sort: SortValue = .seriesDefault
    var status: SerieStatus?
    var firstLetter: String?
    var minDifficulty: Int?
    var maxDifficulty: Int?
    var readprogress: ProgressFilter?
    var readlistOnly: Bool = false
    var page: Int = 1
    var limit: Int = 25

    var isFiltering: Bool {
        genre != nil || author != nil || status != nil || minDifficulty != nil
            || maxDifficulty != nil || (readprogress != nil && readprogress != .all)
            || readlistOnly || firstLetter != nil
    }

    static func resetFilters(_ query: SeriesQuery) -> SeriesQuery {
        var result = query
        result.genre = nil
        result.author = nil
        result.status = nil
        result.firstLetter = nil
        result.minDifficulty = nil
        result.maxDifficulty = nil
        result.readprogress = nil
        result.readlistOnly = false
        return result
    }

    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []

        if let name, !name.isEmpty {
            items.append(URLQueryItem(name: "name", value: name))
        }
        if let genre {
            items.append(URLQueryItem(name: "genre", value: genre))
        }
        if let author {
            items.append(URLQueryItem(name: "author", value: author))
        }
        items.append(URLQueryItem(name: "sort", value: sort.rawValue))
        if let status {
            items.append(URLQueryItem(name: "status", value: status.rawValue))
        }
        if let firstLetter {
            items.append(URLQueryItem(name: "firstLetter", value: firstLetter))
        }
        if let minDifficulty {
            items.append(URLQueryItem(name: "min", value: String(minDifficulty)))
        }
        if let maxDifficulty {
            items.append(URLQueryItem(name: "max", value: String(maxDifficulty)))
        }
        if let readprogress, readprogress != .all {
            items.append(URLQueryItem(name: "readprogress", value: readprogress.rawValue))
        }
        if readlistOnly {
            items.append(URLQueryItem(name: "readlist", value: "true"))
        }

        items.append(URLQueryItem(name: "page", value: String(page)))
        items.append(URLQueryItem(name: "limit", value: String(limit)))

        return items
    }

    var alphabetQueryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []

        if let genre {
            items.append(URLQueryItem(name: "genre", value: genre))
        }
        if let author {
            items.append(URLQueryItem(name: "author", value: author))
        }
        if let status {
            items.append(URLQueryItem(name: "status", value: status.rawValue))
        }
        if let minDifficulty {
            items.append(URLQueryItem(name: "min", value: String(minDifficulty)))
        }
        if let maxDifficulty {
            items.append(URLQueryItem(name: "max", value: String(maxDifficulty)))
        }

        return items
    }

    var randomQueryItems: [URLQueryItem] {
        var items = alphabetQueryItems

        if let readprogress, readprogress != .all {
            items.append(URLQueryItem(name: "readprogress", value: readprogress.rawValue))
        }
        if readlistOnly {
            items.append(URLQueryItem(name: "readlist", value: "true"))
        }

        return items
    }
}

struct BooksQuery: Sendable, Equatable {
    var variant: LibraryVariant = .all
    var name: String?
    var serie: String?
    var sort: SortValue?
    var status: ProgressStatus?
    var page: Int?
    var limit: Int?

    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []

        if let name, !name.isEmpty {
            items.append(URLQueryItem(name: "name", value: name))
        }
        if let serie {
            items.append(URLQueryItem(name: "serie", value: serie))
        }
        if let sort {
            items.append(URLQueryItem(name: "sort", value: sort.rawValue))
        }
        if let status {
            items.append(URLQueryItem(name: "status", value: status.rawValue))
        }
        if let page {
            items.append(URLQueryItem(name: "page", value: String(page)))
        }
        if let limit {
            items.append(URLQueryItem(name: "limit", value: String(limit)))
        }

        return items
    }
}
