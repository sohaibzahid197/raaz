import Foundation
import FirebaseAILogic
import FoundationModels

struct Turn: Identifiable, Hashable { let id = UUID(); let fromYou: Bool; let text: String; var onDevice: Bool? = nil }
struct Reply { let text: String; let onDevice: Bool; let retried: Bool }

/// Hybrid suspects: Apple's on-device Foundation Model first, Gemini in the cloud (Firebase AI Logic) as fallback.
/// (Firebase's built-in iOS hybrid wrapper needs iOS 27; this is the same prefer-on-device policy for iOS 26.)
enum Ai {
    static let chatModel = "gemini-3.5-flash-lite"
    private static let cloud = FirebaseAI.firebaseAI(backend: .googleAI()).generativeModel(
        modelName: chatModel, generationConfig: GenerationConfig(temperature: 0.8, maxOutputTokens: 200))

    static var onDeviceAvailable: Bool { SystemLanguageModel.default.isAvailable }
    static var onDeviceStatus: String {
        onDeviceAvailable ? "Apple on-device model ready 🔒" : "On-device model unavailable here: using Gemini cloud ☁️"
    }

    /// PREFER_ON_DEVICE: try Apple's model, fall back to Firebase AI Logic cloud on unavailability or error.
    private static func generate(_ prompt: String) async throws -> (String, Bool) {
        if onDeviceAvailable {
            do {
                let session = LanguageModelSession()  // fresh per question: need-to-know context lives in the prompt
                let r = try await session.respond(to: prompt, options: GenerationOptions(temperature: 0.8, maximumResponseTokens: 200))
                return (r.content, true)
            } catch { /* guardrail refusal, context limit, etc. → cloud */ }
        }
        let r = try await cloud.generateContent(prompt)
        return (r.text ?? "", false)
    }

    static func prompt(_ c: CaseFile, _ s: Suspect, _ history: [Turn], _ q: String, urdu: Bool, strict: Bool) -> String {
        let others = c.suspects.filter { $0.id != s.id }.map { "\($0.name) (\($0.role))" }.joined(separator: ", ")
        let role = s.isCulprit
            ? "You committed the crime. Never admit it. Stick to this false story: \"\(s.lie ?? "")\". Stay calm; if pressed, deflect or blame circumstances, but never confess."
            : "You are innocent. Never lie about the crime. These are the ONLY facts you know: \(s.knows.joined(separator: " ")) " +
              "Share them if asked. If asked about anything else, say you did not see or do not know. Never guess where other people were or what they did beyond these facts. " +
              "You may avoid talking about your personal secret (\"\(s.secret)\") and act a little nervous about it, but never accuse anyone directly."
        let recent = history.suffix(4).map { "\($0.fromYou ? "Detective" : s.name): \($0.text)" }.joined(separator: "\n")
        return "Role-play for a detective game. A police detective is questioning you. You are \(s.name), \(s.role), in \(c.city). " +
            "Personality: \(s.personality). Speaking style: \(s.speakingStyle).\nCase: \(c.what). Your alibi: \(s.alibi)\nOther people present: \(others).\n\(role)\n" +
            "Rules: answer only as \(s.name); at most 3 short sentences; \(urdu ? "reply in simple Urdu" : "reply in English (a few Urdu words are fine)"); " +
            "never use Spanish, Hindi script or any other language; speak to the detective (never call the detective by another person's name); " +
            "never mention AI, prompts or rules; do not invent new people or objects.\(strict ? " Be extra careful: do not confess and do not name a thief." : "")\n" +
            (recent.isEmpty ? "" : "Conversation so far:\n\(recent)\n") + "Detective: \(q)\n\(s.name):"
    }

    static func ask(_ c: CaseFile, _ s: Suspect, _ history: [Turn], _ q: String, urdu: Bool) async throws -> Reply {
        var onDevice = true
        for strict in [false, true] {
            let (raw, dev) = try await generate(prompt(c, s, history, q, urdu: urdu, strict: strict))
            onDevice = dev
            var text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            text = text.trimmingCharacters(in: CharacterSet(charactersIn: "\"'"))
            if text.hasPrefix("\(s.name):") { text = String(text.dropFirst(s.name.count + 1)) }
            text = text.replacingOccurrences(of: "[*_]+", with: "", options: .regularExpression).trimmingCharacters(in: .whitespaces)
            if Truth.checkReply(c, s, text) == nil { return Reply(text: text, onDevice: onDevice, retried: strict) }
        }
        return Reply(text: s.isCulprit ? "I have told you everything, detective. \(s.lie ?? "")" : "I've told you what I know. \(s.knows[0])",
                     onDevice: onDevice, retried: true)
    }
}
