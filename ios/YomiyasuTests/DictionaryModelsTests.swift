import XCTest

@testable import Yomiyasu

final class DictionaryModelsTests: XCTestCase {
    private let decoder = JSONDecoder.yomiyasu()

    func testV1DecodesArrayOfDisplays() throws {
        let json = """
        [{
          "display": "同級生",
          "words": [{
            "id": "1452120",
            "frequency": "3200",
            "pitches": [{"position": 0}],
            "kanji": [{"common": true, "text": "同級生", "tags": []}],
            "kana": [
              {"common": true, "text": "どうきゅうせい", "tags": [], "appliesToKanji": ["*"]},
              {"common": false, "text": "ドウキュウセイ", "tags": [], "appliesToKanji": ["*"]}
            ],
            "sense": [{
              "partOfSpeech": ["n"],
              "appliesToKanji": ["*"],
              "appliesToKana": ["*"],
              "misc": [],
              "gloss": [{"lang": "eng", "gender": null, "text": "classmate"}]
            }]
          }]
        }]
        """

        let displays = try decoder.decode([DictionaryDisplay].self, from: Data(json.utf8))

        XCTAssertEqual(displays.count, 1)

        let display = try XCTUnwrap(displays.first)
        XCTAssertEqual(display.display, "同級生")
        XCTAssertEqual(display.words.count, 1)

        let word = try XCTUnwrap(display.words.first)
        XCTAssertEqual(word.headword, "同級生")
        XCTAssertEqual(word.mainReading, "どうきゅうせい")
        XCTAssertEqual(word.frequencyRank, 3200)
        XCTAssertEqual(word.pitchPositions, [0])
        XCTAssertEqual(word.firstGlosses, ["classmate"])
    }

    func testV2DecodesMultipleTokens() throws {
        let json = """
        [
          {"display": "二", "words": [{"id": "1", "kanji": [{"text": "二", "tags": []}], "kana": [{"text": "に", "tags": []}]}]},
          {"display": "人", "words": []},
          {"display": "の", "words": [{"id": "2", "kana": [{"text": "の", "tags": []}]}]}
        ]
        """

        let displays = try decoder.decode([DictionaryDisplay].self, from: Data(json.utf8))

        XCTAssertEqual(displays.map(\.display), ["二", "人", "の"])
        XCTAssertEqual(displays[1].words.count, 0)
        XCTAssertEqual(displays[2].words.first?.headword, "の")
    }

    func testWordWithMissingOptionalFields() throws {
        let json = """
        [{"display": "テスト", "words": [{"id": "99", "kana": [{"text": "てすと", "tags": []}]}]}]
        """

        let displays = try decoder.decode([DictionaryDisplay].self, from: Data(json.utf8))
        let word = try XCTUnwrap(displays.first?.words.first)

        XCTAssertNil(word.frequencyRank)
        XCTAssertTrue(word.pitchPositions.isEmpty)
        XCTAssertEqual(word.headword, "てすと")
        XCTAssertTrue(word.firstGlosses.isEmpty)
    }
}
