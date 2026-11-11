import XCTest
@testable import Raaz

final class TruthTests: XCTestCase {
    var c: CaseFile!
    override func setUpWithError() throws {
        let url = Bundle(for: Self.self).url(forResource: "cases", withExtension: "json")
            ?? Bundle.main.url(forResource: "cases", withExtension: "json")!
        c = try loadCases(Data(contentsOf: url))[0]
    }
    func s(_ id: String) -> Suspect { c.suspects.first { $0.id == id }! }

    func testRevealClues() {
        XCTAssertTrue(Truth.revealClues(c, suspectId: "sana", question: "When was the power cut?", found: []).map(\.id).contains("c1"))
        XCTAssertTrue(Truth.revealClues(c, suspectId: "mian", question: "When was the power cut?", found: []).isEmpty)
    }
    func testContradiction() {
        XCTAssertEqual(Truth.contradictions(c, found: ["c2"]).first?.suspectId, "farhan")
        XCTAssertTrue(Truth.contradictions(c, found: ["c1"]).isEmpty)
    }
    func testCheckReply() {
        XCTAssertNil(Truth.checkReply(c, s("sana"), "The lights went out at 7:10. I ran to the generator."))
        XCTAssertNotNil(Truth.checkReply(c, s("sana"), "As an AI language model, I cannot say."))
        XCTAssertNotNil(Truth.checkReply(c, s("farhan"), "Fine, I took the locket."))
        XCTAssertNotNil(Truth.checkReply(c, s("sana"), "Mr. Qureshi was near the back counter."))
        XCTAssertNil(Truth.checkReply(c, s("bilal"), "Farhan went out for chai at 7:20."))
    }
    func testScore() {
        XCTAssertEqual(Truth.score(c, suspectId: "farhan", motive: "Gambling debt", clueId: "c2", questions: 8).points, 110)
        XCTAssertEqual(Truth.score(c, suspectId: "sana", motive: "Gambling debt", clueId: "c2", questions: 5).points, 0)
    }
}
