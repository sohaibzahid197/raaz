import Foundation

// Swift port of web/src/engine (types + Truth Engine). Same rules on every platform.
struct Suspect: Codable, Identifiable, Hashable {
    let id, name, role, personality, speakingStyle, alibi: String
    let knows: [String]
    let secret: String
    let isCulprit: Bool
    let lie: String?
}
struct Clue: Codable, Identifiable, Hashable {
    let id, text, from: String
    let keywords: [String]
    let contradicts: String?
}
struct Solution: Codable, Hashable { let culprit, motive, keyClue, story: String }
struct CaseFile: Codable, Identifiable, Hashable {
    let id, title: String
    let titleUr: String?
    let city, intro, what: String
    let suspects: [Suspect]
    let clues: [Clue]
    let motives: [String]
    let solution: Solution
    var culprit: Suspect { suspects.first { $0.isCulprit }! }
}
struct Score { let points, max: Int; let culprit, motive, clue: Bool; let rank: String }

func loadCases(_ data: Data) throws -> [CaseFile] { try JSONDecoder().decode([CaseFile].self, from: data) }

enum Truth {
    static func revealClues(_ c: CaseFile, suspectId: String, question: String, found: Set<String>) -> [Clue] {
        let q = question.lowercased()
        return c.clues.filter { $0.from == suspectId && !found.contains($0.id) && $0.keywords.contains { q.contains($0.lowercased()) } }
    }

    static func contradictions(_ c: CaseFile, found: Set<String>) -> [(suspectId: String, clueId: String)] {
        c.clues.compactMap { cl in cl.contradicts.flatMap { found.contains(cl.id) ? ($0, cl.id) : nil } }
    }

    private static func matches(_ pattern: String, _ s: String) -> Bool {
        s.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil
    }
    private static let confession = [#"\bi (stole|took|did it|killed|robbed)\b"#, #"\bit was me\b"#, #"\bmain ne (chori|churaya)"#]
    private static let breakChar = [#"\bas an ai\b"#, #"\blanguage model\b"#, #"\bi am an ai\b"#, #"\bi'm an ai\b"#, #"\bsystem prompt\b"#]

    /// nil when the reply is fine, otherwise the reason it was rejected.
    static func checkReply(_ c: CaseFile, _ s: Suspect, _ reply: String) -> String? {
        if reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return "empty" }
        if breakChar.contains(where: { matches($0, reply) }) { return "broke character" }
        if confession.contains(where: { matches($0, reply) }) { return "confession" }
        if !s.isCulprit {
            let name = c.culprit.name
            let first = NSRegularExpression.escapedPattern(for: String(name.split(separator: " ")[0]))
            if matches(#"\b"# + first + #"\b[^.]{0,40}\b(stole|took it|is the thief|did it|is guilty)\b"#, reply) { return "named culprit" }
            // Innocents may only talk about the culprit if their own facts mention them.
            let parts = name.lowercased().split(separator: " ").map(String.init).filter { $0.count > 2 }
            let knowsCulprit = s.knows.contains { k in parts.contains { k.lowercased().contains($0) } }
            if !knowsCulprit && parts.contains(where: { matches(#"\b"# + NSRegularExpression.escapedPattern(for: $0) + #"\b"#, reply) }) {
                return "invented fact about culprit"
            }
        }
        if reply.split(whereSeparator: \.isWhitespace).count > 90 { return "too long" }
        return nil
    }

    static func score(_ c: CaseFile, suspectId: String, motive: String, clueId: String, questions: Int) -> Score {
        let culprit = suspectId == c.solution.culprit
        let mot = culprit && motive == c.solution.motive
        let clue = culprit && (clueId == c.solution.keyClue || c.clues.first { $0.id == clueId }?.contradicts == c.solution.culprit)
        var p = (culprit ? 60 : 0) + (mot ? 20 : 0) + (clue ? 20 : 0)
        if culprit && questions <= 12 { p += 10 }
        let rank = p >= 100 ? "Master Detective" : p >= 80 ? "Inspector" : p >= 60 ? "Sergeant" : "Constable"
        return Score(points: p, max: 110, culprit: culprit, motive: mot, clue: clue, rank: rank)
    }
}
