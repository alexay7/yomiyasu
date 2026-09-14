import Foundation
import Nuke

@MainActor
enum ImageRequestFactory {
    static func make(url: URL, token: String?) -> ImageRequest {
        var urlRequest = URLRequest(url: url)

        if let token {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return ImageRequest(urlRequest: urlRequest)
    }
}
