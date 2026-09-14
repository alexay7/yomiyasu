import Foundation
@preconcurrency import ReadiumShared
@preconcurrency import ReadiumStreamer

@MainActor
final class ReadiumAccess {
    static let shared = ReadiumAccess()

    private lazy var httpClient: HTTPClient = DefaultHTTPClient()

    private lazy var assetRetriever = AssetRetriever(httpClient: httpClient)

    private lazy var publicationOpener = PublicationOpener(
        parser: DefaultPublicationParser(
            httpClient: httpClient,
            assetRetriever: assetRetriever,
            pdfFactory: DefaultPDFDocumentFactory()
        ),
        contentProtections: []
    )

    func openPublication(at url: URL) async throws -> Publication {
        guard let absoluteURL = FileURL(url: url) else {
            throw APIError.invalidURL
        }

        let asset = try await assetRetriever.retrieve(url: absoluteURL).get()

        return try await publicationOpener.open(
            asset: asset,
            allowUserInteraction: false
        ).get()
    }

    func progressMap(for publication: Publication) async -> NovelProgressMap {
        var entries: [NovelProgressMap.Entry] = []
        var cumulative = 0
        var containsVerticalText = false

        for link in publication.readingOrder {
            guard let resource = publication.get(link) else { continue }

            let html = (try? await resource.read().asString().get()) ?? ""
            let characters = NovelProgressMap.japaneseCharacterCount(inHTML: html)

            if NovelProgressMap.containsVerticalWriting(html) {
                containsVerticalText = true
            }

            entries.append(
                NovelProgressMap.Entry(
                    href: link.href,
                    mediaType: link.mediaType?.string ?? "application/xhtml+xml",
                    characters: characters,
                    cumulativeBefore: cumulative
                )
            )

            cumulative += characters
        }

        for link in publication.resources where link.mediaType?.string == "text/css" {
            guard let resource = publication.get(link),
                  let css = try? await resource.read().asString().get() else {
                continue
            }

            if NovelProgressMap.containsVerticalWriting(css) {
                containsVerticalText = true
            }
        }

        return NovelProgressMap(entries: entries, containsVerticalText: containsVerticalText)
    }
}
