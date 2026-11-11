import SwiftUI

extension Color {
    init(hex: UInt) { self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255) }
    static let bg = Color(hex: 0x0D0B09), paper = Color(hex: 0x1A1612), ink = Color(hex: 0xEFE6D6), muted = Color(hex: 0xA8998A)
    static let lantern = Color(hex: 0xF2A541), blood = Color(hex: 0xE4574B), ok = Color(hex: 0x79C99E), cloud = Color(hex: 0x7FB2F0), line = Color(hex: 0x3A3027)
}

enum Screen: Hashable { case board, talk(Suspect), accuse, result(Int) }

@Observable final class Game {
    let cases: [CaseFile]
    var current: CaseFile
    var chats: [String: [Turn]] = [:]
    var found: Set<String> = []
    var urdu = false
    var path: [Screen] = []
    var score: Score?
    init() {
        let url = Bundle.main.url(forResource: "cases", withExtension: "json")!
        cases = (try? loadCases(Data(contentsOf: url))) ?? []
        current = cases[0]
    }
    var asked: Int { chats.values.reduce(0) { $0 + $1.filter(\.fromYou).count } }
    func open(_ c: CaseFile) { current = c; chats = [:]; found = []; score = nil; path = [.board] }
}

struct RootView: View {
    @State private var game = Game()
    var body: some View {
        NavigationStack(path: $game.path) {
            HomeView(game: game)
                .navigationDestination(for: Screen.self) { s in
                    Group {
                        switch s {
                        case .board: BoardView(game: game)
                        case .talk(let su): TalkView(game: game, s: su)
                        case .accuse: AccuseView(game: game)
                        case .result: ResultView(game: game)
                        }
                    }
                    .toolbar { ToolbarItem(placement: .topBarTrailing) { LangButton(game: game) } }
                }
                .toolbar { ToolbarItem(placement: .topBarTrailing) { LangButton(game: game) } }
        }
        .tint(.lantern)
    }
}

struct LangButton: View {
    @Bindable var game: Game
    var body: some View { Button(game.urdu ? "English" : "اردو") { game.urdu.toggle() } }
}

struct CardBox<Content: View>: View {
    var border: Color = .line
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 4) { content }
            .frame(maxWidth: .infinity, alignment: .leading).padding(14)
            .background(Color.paper, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(border, lineWidth: 1))
    }
}

struct Screenbg: ViewModifier {
    func body(content: Content) -> some View { content.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top).background(Color.bg) }
}

struct HomeView: View {
    let game: Game
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline) {
                    Text("راز").font(.system(size: 40)).foregroundStyle(Color.lantern)
                    Text("RAAZ").font(.system(.title3, design: .serif)).tracking(5).foregroundStyle(Color.muted)
                }
                Text("Every suspect is an AI. One of them is lying.").font(.system(.title3, design: .serif)).foregroundStyle(Color.lantern)
                Text("Suspects run on this iPhone with Apple's on-device model when available 🔒, otherwise Gemini in the cloud ☁️.")
                    .font(.footnote).foregroundStyle(Color.muted)
                Text(Ai.onDeviceStatus).font(.caption).foregroundStyle(Color.ok)
                ForEach(game.cases) { c in
                    Button { game.open(c) } label: {
                        CardBox {
                            if let ur = c.titleUr { Text(ur).foregroundStyle(Color.lantern) }
                            Text(c.title).font(.system(.headline, design: .serif)).foregroundStyle(Color.ink)
                            Text(c.city).font(.footnote).foregroundStyle(Color.muted)
                        }
                    }.buttonStyle(.plain)
                }
            }.padding(16)
        }.modifier(Screenbg())
    }
}

struct BoardView: View {
    let game: Game
    var body: some View {
        let c = game.current
        let flagged = Set(Truth.contradictions(c, found: game.found).map(\.suspectId))
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("CASE FILE").font(.caption.bold()).foregroundStyle(Color(hex: 0xA8321F))
                    Text(c.title).font(.system(.title2, design: .serif))
                    Text(c.intro).font(.system(.subheadline, design: .monospaced))
                }.foregroundStyle(Color(hex: 0x2A2118)).padding(16).frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(hex: 0xE9DCC3), in: RoundedRectangle(cornerRadius: 6))
                Text("Suspects").foregroundStyle(Color.muted)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(c.suspects) { s in
                        NavigationLink(value: Screen.talk(s)) {
                            CardBox(border: flagged.contains(s.id) ? .blood : .line) {
                                Text(s.name).bold().foregroundStyle(Color.ink)
                                Text(s.role).font(.caption).foregroundStyle(Color.muted)
                                Text("\(game.chats[s.id, default: []].filter(\.fromYou).count) Q").font(.caption).foregroundStyle(Color.muted)
                                if flagged.contains(s.id) { Text("⚠ Contradiction").font(.caption.bold()).foregroundStyle(Color.blood) }
                            }
                        }.buttonStyle(.plain)
                    }
                }
                CardBox {
                    Text("📓 Notebook (\(game.found.count)/\(c.clues.count))").foregroundStyle(Color.ink)
                    if game.found.isEmpty { Text("Ask suspects about times, places and objects to find clues.").font(.footnote).foregroundStyle(Color.muted) }
                    ForEach(c.clues.filter { game.found.contains($0.id) }) { cl in
                        Text("• \(cl.text)").font(.subheadline).foregroundStyle(Color.ink).padding(.top, 4)
                        if let id = cl.contradicts, let who = c.suspects.first(where: { $0.id == id }) {
                            Text("⚠ Contradiction: \(who.name)").font(.caption).foregroundStyle(Color.blood)
                        }
                    }
                }
                NavigationLink(value: Screen.accuse) {
                    Text("Make an accusation").bold().frame(maxWidth: .infinity).padding(14)
                        .background(Color.lantern, in: RoundedRectangle(cornerRadius: 12)).foregroundStyle(Color(hex: 0x1A1208))
                }
            }.padding(16)
        }.modifier(Screenbg()).navigationTitle(c.title).navigationBarTitleDisplayMode(.inline)
    }
}

struct TalkView: View {
    let game: Game
    let s: Suspect
    @State private var q = ""
    @State private var busy = false
    var turns: [Turn] { game.chats[s.id, default: []] }
    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        Text("Alibi: \(s.alibi)").font(.footnote).foregroundStyle(Color.muted).padding(.vertical, 8)
                        ForEach(turns) { t in Bubble(t: t).id(t.id) }
                        if busy { Text("\(s.name) is thinking…").foregroundStyle(Color.muted).id("busy") }
                    }.padding(16)
                }
                .onChange(of: turns.count) { withAnimation { if let last = turns.last?.id { proxy.scrollTo(last, anchor: .bottom) } } }
            }
            HStack {
                TextField("Ask \(s.name.split(separator: " ")[0])…", text: $q).textFieldStyle(.roundedBorder).onSubmit(send)
                Button("Ask", action: send).buttonStyle(.borderedProminent).disabled(q.trimmingCharacters(in: .whitespaces).isEmpty || busy)
            }.padding(12).background(Color.paper)
        }
        .modifier(Screenbg()).navigationTitle(s.name).navigationBarTitleDisplayMode(.inline)
    }
    func send() {
        let question = q.trimmingCharacters(in: .whitespaces)
        guard !question.isEmpty, !busy else { return }
        q = ""; busy = true
        let c = game.current
        game.chats[s.id, default: []].append(Turn(fromYou: true, text: question))
        game.found.formUnion(Truth.revealClues(c, suspectId: s.id, question: question, found: game.found).map(\.id))
        let history = turns
        Task {
            do {
                let r = try await Ai.ask(c, s, history, question, urdu: game.urdu)
                game.chats[s.id, default: []].append(Turn(fromYou: false, text: r.text, onDevice: r.onDevice))
            } catch {
                game.chats[s.id, default: []].append(Turn(fromYou: false, text: "(No answer: \(String(describing: error).prefix(120)))"))
            }
            busy = false
        }
    }
}

struct AccuseView: View {
    let game: Game
    @State private var sid: String?
    @State private var mot: String?
    @State private var cl: String?
    func pick(_ label: String, _ on: Bool, _ tap: @escaping () -> Void) -> some View {
        Button(action: tap) { CardBox(border: on ? .lantern : .line) { Text(label).font(.subheadline).foregroundStyle(Color.ink) } }.buttonStyle(.plain)
    }
    var body: some View {
        let c = game.current
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                Text("Who did it?").foregroundStyle(Color.muted)
                ForEach(c.suspects) { s in pick(s.name, sid == s.id) { sid = s.id } }
                Text("Motive").foregroundStyle(Color.muted).padding(.top, 8)
                ForEach(c.motives, id: \.self) { m in pick(m, mot == m) { mot = m } }
                Text("Your proof").foregroundStyle(Color.muted).padding(.top, 8)
                if game.found.isEmpty { Text("No clues yet. Question the suspects first.").font(.footnote).foregroundStyle(Color.lantern) }
                ForEach(c.clues.filter { game.found.contains($0.id) }) { x in pick(x.text, cl == x.id) { cl = x.id } }
                Button {
                    game.score = Truth.score(c, suspectId: sid!, motive: mot!, clueId: cl!, questions: game.asked)
                    game.path.append(.result(game.score!.points))
                } label: {
                    Text("Accuse").bold().frame(maxWidth: .infinity).padding(14).foregroundStyle(.white)
                        .background(Color.blood.opacity(sid != nil && mot != nil && cl != nil ? 1 : 0.35), in: RoundedRectangle(cornerRadius: 12))
                }.disabled(sid == nil || mot == nil || cl == nil).padding(.vertical, 12)
            }.padding(16)
        }.modifier(Screenbg()).navigationTitle("Accusation").navigationBarTitleDisplayMode(.inline)
    }
}

struct ResultView: View {
    let game: Game
    var body: some View {
        let c = game.current
        ScrollView {
            if let sc = game.score {
                VStack(spacing: 10) {
                    Text(sc.culprit ? "✔ Case solved" : "✘ Wrong suspect").font(.system(.largeTitle, design: .serif)).foregroundStyle(sc.culprit ? Color.ok : Color.blood)
                    Text("\(sc.points)/\(sc.max) · \(sc.rank)").font(.title2).foregroundStyle(Color.ink)
                    Text("Questions asked: \(game.asked) · Motive \(sc.motive ? "✔" : "✘") · Proof \(sc.clue ? "✔" : "✘")").font(.footnote).foregroundStyle(Color.muted)
                    CardBox { Text("What really happened").foregroundStyle(Color.muted); Text(c.solution.story).foregroundStyle(Color.ink) }
                    Button { game.path = [] } label: {
                        Text("Back to case files").bold().frame(maxWidth: .infinity).padding(14)
                            .background(Color.lantern, in: RoundedRectangle(cornerRadius: 12)).foregroundStyle(Color(hex: 0x1A1208))
                    }
                }.padding(16)
            }
        }.modifier(Screenbg()).navigationBarBackButtonHidden()
    }
}

struct Bubble: View {
    let t: Turn
    var body: some View {
        let bg: Color = t.fromYou ? .lantern : .paper
        let fg: Color = t.fromYou ? Color(hex: 0x1A1208) : .ink
        HStack {
            if t.fromYou { Spacer(minLength: 40) }
            VStack(alignment: .leading, spacing: 4) {
                Text(t.text).foregroundStyle(fg)
                if let d = t.onDevice {
                    Text(d ? "🔒 On-device" : "☁️ Cloud").font(.caption2.bold()).foregroundStyle(d ? Color.ok : Color.cloud)
                }
            }
            .padding(10).background(bg, in: RoundedRectangle(cornerRadius: 14))
            if !t.fromYou { Spacer(minLength: 40) }
        }
    }
}
