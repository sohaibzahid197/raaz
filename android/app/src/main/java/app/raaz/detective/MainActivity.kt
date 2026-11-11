package app.raaz.detective

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

private val Bg = Color(0xFF0D0B09); private val Paper = Color(0xFF1A1612); private val Ink = Color(0xFFEFE6D6)
private val Muted = Color(0xFFA8998A); private val Lantern = Color(0xFFF2A541); private val Blood = Color(0xFFE4574B)
private val Ok = Color(0xFF79C99E); private val CloudC = Color(0xFF7FB2F0); private val Line = Color(0xFF3A3027)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val cases = parseCases(assets.open("cases.json").bufferedReader().readText())
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(background = Bg, surface = Paper, primary = Lantern, onPrimary = Color(0xFF1A1208), onSurface = Ink)) {
                Surface(Modifier.fillMaxSize(), color = Bg) { Game(cases) }
            }
        }
    }
}

private sealed interface Screen { data object Home : Screen; data object Board : Screen; data class Talk(val s: Suspect) : Screen; data object Accuse : Screen; data class Result(val sc: Score) : Screen }

@Composable
private fun Game(cases: List<CaseFile>) {
    var screen by remember { mutableStateOf<Screen>(Screen.Home) }
    var case by remember { mutableStateOf(cases[0]) }
    val chats = remember { mutableStateMapOf<String, List<Turn>>() }
    var found by remember { mutableStateOf(setOf<String>()) }
    var urdu by remember { mutableStateOf(false) }
    val asked = chats.values.sumOf { l -> l.count { it.fromYou } }
    BackHandler(screen != Screen.Home) { screen = if (screen == Screen.Board) Screen.Home else Screen.Board }

    Column(Modifier.fillMaxSize().systemBarsPadding().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("راز", color = Lantern, fontSize = 30.sp, modifier = Modifier.clickable { screen = Screen.Home })
            Text("  RAAZ", color = Muted, letterSpacing = 4.sp, fontFamily = FontFamily.Serif)
            Spacer(Modifier.weight(1f))
            OutlinedButton(onClick = { urdu = !urdu }) { Text(if (urdu) "English" else "اردو", color = Ink) }
        }
        when (val s = screen) {
            Screen.Home -> Home(cases) { case = it; chats.clear(); found = emptySet(); screen = Screen.Board }
            Screen.Board -> Board(case, found, chats) { screen = it }
            is Screen.Talk -> Talk(case, s.s, chats[s.s.id].orEmpty(), urdu,
                onTurn = { t -> chats[s.s.id] = chats[s.s.id].orEmpty() + t },
                onQuestion = { q -> found = found + Truth.revealClues(case, s.s.id, q, found).map { it.id } },
                back = { screen = Screen.Board })
            Screen.Accuse -> Accuse(case, found) { sid, m, cl -> screen = Screen.Result(Truth.score(case, sid, m, cl, asked)) }
            is Screen.Result -> Result(case, s.sc, asked) { screen = Screen.Home }
        }
    }
}

@Composable private fun Card(mod: Modifier = Modifier, border: Color = Line, onClick: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) =
    Surface(mod.fillMaxWidth().padding(top = 10.dp).let { if (onClick != null) it.clickable(onClick = onClick) else it },
        shape = RoundedCornerShape(14.dp), color = Paper, border = BorderStroke(1.dp, border)) { Column(Modifier.padding(14.dp), content = content) }

@Composable private fun Home(cases: List<CaseFile>, open: (CaseFile) -> Unit) = Column(Modifier.verticalScroll(rememberScrollState())) {
    Text("Every suspect is an AI. One of them is lying.", color = Lantern, fontFamily = FontFamily.Serif, fontSize = 18.sp, modifier = Modifier.padding(vertical = 12.dp))
    Text("Suspects run on this phone with Gemini Nano when available 🔒, otherwise in the cloud ☁️.", color = Muted, fontSize = 13.sp)
    cases.forEach { c -> Card(onClick = { open(c) }) {
        Text(c.titleUr, color = Lantern); Text(c.title, color = Ink, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Serif); Text(c.city, color = Muted, fontSize = 13.sp)
    } }
}

@Composable private fun Board(c: CaseFile, found: Set<String>, chats: Map<String, List<Turn>>, go: (Screen) -> Unit) {
    val flagged = Truth.contradictions(c, found)
    Column(Modifier.verticalScroll(rememberScrollState())) {
        Surface(Modifier.fillMaxWidth().padding(top = 8.dp), color = Color(0xFFE9DCC3), shape = RoundedCornerShape(6.dp)) {
            Column(Modifier.padding(16.dp)) {
                Text("CASE FILE", color = Color(0xFFA8321F), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                Text(c.title, color = Color(0xFF2A2118), fontSize = 22.sp, fontFamily = FontFamily.Serif)
                Text(c.intro, color = Color(0xFF2A2118), fontFamily = FontFamily.Monospace, fontSize = 14.sp)
            }
        }
        Text("Suspects", color = Muted, modifier = Modifier.padding(top = 16.dp))
        c.suspects.chunked(2).forEach { row -> Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            row.forEach { s -> val f = flagged.any { it.first == s.id }
                Card(Modifier.weight(1f), border = if (f) Blood else Line, onClick = { go(Screen.Talk(s)) }) {
                    Text(s.name, color = Ink, fontWeight = FontWeight.Bold); Text(s.role, color = Muted, fontSize = 12.sp)
                    Text("${chats[s.id].orEmpty().count { it.fromYou }} Q", color = Muted, fontSize = 12.sp)
                    if (f) Text("⚠ Contradiction", color = Blood, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        } }
        Card {
            Text("📓 Notebook (${found.size}/${c.clues.size})", color = Ink)
            if (found.isEmpty()) Text("Ask suspects about times, places and objects to find clues.", color = Muted, fontSize = 13.sp)
            c.clues.filter { it.id in found }.forEach { cl ->
                Text("• ${cl.text}", color = Ink, fontSize = 14.sp, modifier = Modifier.padding(top = 6.dp))
                cl.contradicts?.let { id -> Text("⚠ Contradiction: ${c.suspects.first { it.id == id }.name}", color = Blood, fontSize = 12.sp) }
            }
        }
        Button(onClick = { go(Screen.Accuse) }, Modifier.fillMaxWidth().padding(top = 16.dp)) { Text("Make an accusation") }
    }
}

@Composable private fun Talk(c: CaseFile, s: Suspect, turns: List<Turn>, urdu: Boolean, onTurn: (Turn) -> Unit, onQuestion: (String) -> Unit, back: () -> Unit) {
    var q by remember { mutableStateOf("") }; var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope(); val list = rememberLazyListState()
    LaunchedEffect(turns.size, busy) { if (turns.isNotEmpty()) list.animateScrollToItem(turns.size) }
    Column(Modifier.fillMaxSize()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = back) { Text("← Back", color = Ink) }
            Column { Text(s.name, color = Ink, fontWeight = FontWeight.Bold); Text(s.role, color = Muted, fontSize = 12.sp) }
        }
        LazyColumn(Modifier.weight(1f), state = list, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item { Text("Alibi: ${s.alibi}", color = Muted, fontSize = 13.sp, modifier = Modifier.padding(vertical = 8.dp)) }
            items(turns) { t ->
                Box(Modifier.fillMaxWidth(), contentAlignment = if (t.fromYou) Alignment.CenterEnd else Alignment.CenterStart) {
                    Column(Modifier.fillMaxWidth(0.85f).background(if (t.fromYou) Lantern else Paper, RoundedCornerShape(14.dp)).padding(10.dp)) {
                        Text(t.text, color = if (t.fromYou) Color(0xFF1A1208) else Ink)
                        t.onDevice?.let { Text(if (it) "🔒 On-device" else "☁️ Cloud", color = if (it) Ok else CloudC, fontSize = 11.sp) }
                    }
                }
            }
            if (busy) item { Text("${s.name} is thinking…", color = Muted) }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(q, { q = it }, Modifier.weight(1f), placeholder = { Text("Ask ${s.name.split(" ")[0]}…") }, singleLine = true)
            Button(enabled = q.isNotBlank() && !busy, modifier = Modifier.padding(start = 8.dp), onClick = {
                val question = q.trim(); q = ""; busy = true
                onTurn(Turn(true, question)); onQuestion(question)
                scope.launch {
                    val r = runCatching { Ai.ask(c, s, turns + Turn(true, question), question, urdu) }
                    onTurn(r.fold({ Turn(false, it.text, it.onDevice) }, { Turn(false, "(No answer: ${it.message?.take(80)})") }))
                    busy = false
                }
            }) { Text("Ask") }
        }
    }
}

@Composable private fun Accuse(c: CaseFile, found: Set<String>, done: (String, String, String) -> Unit) {
    var sid by remember { mutableStateOf<String?>(null) }; var mot by remember { mutableStateOf<String?>(null) }; var cl by remember { mutableStateOf<String?>(null) }
    @Composable fun Pick(label: String, on: Boolean, click: () -> Unit) = Card(border = if (on) Lantern else Line, onClick = click) { Text(label, color = Ink, fontSize = 14.sp) }
    Column(Modifier.verticalScroll(rememberScrollState())) {
        Text("Who did it?", color = Muted, modifier = Modifier.padding(top = 12.dp)); c.suspects.forEach { s -> Pick(s.name, sid == s.id) { sid = s.id } }
        Text("Motive", color = Muted, modifier = Modifier.padding(top = 12.dp)); c.motives.forEach { m -> Pick(m, mot == m) { mot = m } }
        Text("Your proof", color = Muted, modifier = Modifier.padding(top = 12.dp))
        if (found.isEmpty()) Text("No clues yet. Question the suspects first.", color = Lantern, fontSize = 13.sp)
        c.clues.filter { it.id in found }.forEach { x -> Pick(x.text, cl == x.id) { cl = x.id } }
        Button(onClick = { done(sid!!, mot!!, cl!!) }, enabled = sid != null && mot != null && cl != null,
            colors = ButtonDefaults.buttonColors(containerColor = Blood), modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp)) { Text("Accuse", color = Color.White) }
    }
}

@Composable private fun Result(c: CaseFile, sc: Score, asked: Int, home: () -> Unit) = Column(Modifier.verticalScroll(rememberScrollState()).padding(top = 20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
    Text(if (sc.culprit) "✔ Case solved" else "✘ Wrong suspect", color = if (sc.culprit) Ok else Blood, fontSize = 26.sp, fontFamily = FontFamily.Serif)
    Text("${sc.points}/${sc.max} · ${sc.rank}", color = Ink, fontSize = 20.sp, modifier = Modifier.padding(8.dp))
    Text("Questions asked: $asked · Motive ${if (sc.motive) "✔" else "✘"} · Proof ${if (sc.clue) "✔" else "✘"}", color = Muted, fontSize = 13.sp)
    Card { Text("What really happened", color = Muted); Text(c.solution.story, color = Ink) }
    Button(onClick = home, Modifier.fillMaxWidth().padding(top = 16.dp)) { Text("Back to case files") }
}
