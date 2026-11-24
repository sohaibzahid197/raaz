import Foundation
import FirebaseAILogic
import FoundationModels

struct Turn: Identifiable, Hashable { let id = UUID(); let fromYou: Bool; let text: String; var onDevice: Bool? = nil }
struct Reply { let text: String; let onDevice: Bool; let retried: Bool }

/// Hybrid suspects through one API: Apple's Foundation Models `LanguageModelSession`.
/// On-device: Apple's SystemLanguageModel (Apple Intelligence) 🔒.
/// Cloud: Firebase AI Logic's `GeminiLanguageModel`, which plugs Gemini into the same Foundation Models API ☁️.
/// Policy = prefer on-device, fall back to cloud when Apple Intelligence is unavailable or refuses.
enum Ai {
    static let chatModel = "gemini-3.5-flash-lite"
    private static let ai = FirebaseAI.firebaseAI(backend: .googleAI())
    private static let cloudModel = ai.geminiLanguageModel(name: chatModel)

    /// Permissive guardrails: this is a fictional, non-violent mystery game, and the default filter
    /// rejects harmless words like "stolen" or "thief" in the role-play prompt.
    private static let deviceModel = SystemLanguageModel(guardrails: .permissiveContentTransformations)
    static var onDeviceAvailable: Bool { deviceModel.isAvailable }
    static var onDeviceStatus: String {
        onDeviceAvailable ? "Apple on-device model ready 🔒" : "On-device model unavailable here: using Gemini via Firebase ☁️"
    }

    private static let options = GenerationOptions(temperature: 0.8, maximumResponseTokens: 200)

    private static func generate(_ prompt: String) async throws -> (String, Bool) {
        if onDeviceAvailable {
            do {
                // Fresh session per question: the need-to-know case slice lives in the prompt.
                let r = try await LanguageModelSession(model: deviceModel).respond(to: deviceSafe(prompt), options: options)
                return (r.content, true)
            } catch { print("[Raaz] on-device failed, using cloud: \(error)") /* guardrail refusal, context limit, model not ready → cloud */ }
        }
        let r = try await LanguageModelSession(model: cloudModel).respond(to: prompt, options: options)
        return (r.content, false)
    }

    /// Gentler wording for the on-device model's safety filter (same meaning, fictional game).
    private static func deviceSafe(_ p: String) -> String {
        "This is a fictional, family-friendly detective puzzle game. No real people.\n" + p
            .replacingOccurrences(of: "You committed the crime.", with: "You are the one who took the missing item.")
            .replacingOccurrences(of: "about the crime", with: "about the incident")
            .replacingOccurrences(of: "do not name a thief", with: "do not blame anyone")
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
            "Rules: answer only as \(s.name); at most 3 short sentences; \(urdu ? "reply in simple Urdu" : "reply in plain English sentences (no Roman Urdu or Hinglish; at most one Urdu word like ji or bhai)"); " +
            "never use Spanish, Hindi script or any other language; speak to the detective (call them \"detective\" or \"sir\", never by your own or anyone else's name); " +
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
