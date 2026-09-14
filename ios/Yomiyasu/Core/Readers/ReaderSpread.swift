import Foundation

struct ReaderSpread: Identifiable, Hashable, Sendable {
    let id: Int
    let pages: [Int]

    var firstPage: Int { pages.first ?? 0 }
}

enum SpreadLayout {
    static func spreads(pageCount: Int, doublePage: Bool, hasCover: Bool) -> [ReaderSpread] {
        guard pageCount > 0 else { return [] }

        guard doublePage, pageCount > 1 else {
            return (0..<pageCount).map { ReaderSpread(id: $0, pages: [$0]) }
        }

        var spreads: [ReaderSpread] = []
        var index = 0

        if hasCover {
            spreads.append(ReaderSpread(id: 0, pages: [0]))
            index = 1
        }

        while index < pageCount {
            if index + 1 < pageCount {
                spreads.append(ReaderSpread(id: spreads.count, pages: [index, index + 1]))
                index += 2
            } else {
                spreads.append(ReaderSpread(id: spreads.count, pages: [index]))
                index += 1
            }
        }

        return spreads
    }

    static func spreadIndex(forPage page: Int, doublePage: Bool, hasCover: Bool) -> Int {
        guard doublePage else { return page }

        if hasCover {
            return page == 0 ? 0 : 1 + (page - 1) / 2
        }

        return page / 2
    }
}
