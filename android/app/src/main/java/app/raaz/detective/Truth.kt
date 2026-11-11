package app.raaz.detective

import org.json.JSONArray
import org.json.JSONObject

// Kotlin port of web/src/engine (types + Truth Engine). Same rules on every platform.
data class Suspect(
    val id: String, val name: String, val role: String, val personality: String, val speakingStyle: String,
    val alibi: String, val knows: List<String>, val secret: String, val isCulprit: Boolean, val lie: String?,
)
data class Clue(val id: String, val text: String, val from: String, val keywords: List<String>, val contradicts: String?)
data class Solution(val culprit: String, val motive: String, val keyClue: String, val story: String)
data class CaseFile(
    val id: String, val title: String, val titleUr: String, val city: String, val intro: String, val what: String,
    val suspects: List<Suspect>, val clues: List<Clue>, val motives: List<String>, val solution: Solution,
)
data class Score(val points: Int, val max: Int, val culprit: Boolean, val motive: Boolean, val clue: Boolean, val rank: String)

private fun JSONArray.strings() = List(length()) { getString(it) }
private fun JSONObject.str(k: String): String? = if (has(k) && !isNull(k)) getString(k) else null

fun parseCases(json: String): List<CaseFile> {
    val arr = JSONArray(json)
    return List(arr.length()) { i ->
        val c = arr.getJSONObject(i)
        val sus = c.getJSONArray("suspects"); val cl = c.getJSONArray("clues"); val sol = c.getJSONObject("solution")
        CaseFile(
            c.getString("id"), c.getString("title"), c.optString("titleUr"), c.getString("city"), c.getString("intro"), c.getString("what"),
            List(sus.length()) { j -> sus.getJSONObject(j).run {
                Suspect(getString("id"), getString("name"), getString("role"), getString("personality"), getString("speakingStyle"),
                    getString("alibi"), getJSONArray("knows").strings(), getString("secret"), getBoolean("isCulprit"), str("lie"))
            } },
            List(cl.length()) { j -> cl.getJSONObject(j).run {
                Clue(getString("id"), getString("text"), getString("from"), getJSONArray("keywords").strings(), str("contradicts"))
            } },
            c.getJSONArray("motives").strings(),
            Solution(sol.getString("culprit"), sol.getString("motive"), sol.getString("keyClue"), sol.getString("story")),
        )
    }
}

object Truth {
    fun revealClues(c: CaseFile, suspectId: String, question: String, found: Set<String>): List<Clue> {
        val q = question.lowercase()
        return c.clues.filter { it.from == suspectId && it.id !in found && it.keywords.any { k -> q.contains(k.lowercase()) } }
    }

    fun contradictions(c: CaseFile, found: Set<String>): List<Pair<String, String>> =
        c.clues.filter { it.contradicts != null && it.id in found }.map { it.contradicts!! to it.id }

    private val confession = listOf(Regex("\\bi (stole|took|did it|killed|robbed)\\b", RegexOption.IGNORE_CASE),
        Regex("\\bit was me\\b", RegexOption.IGNORE_CASE), Regex("\\bmain ne (chori|churaya)", RegexOption.IGNORE_CASE))
    private val breakChar = listOf("\\bas an ai\\b", "\\blanguage model\\b", "\\bi am an ai\\b", "\\bi'm an ai\\b", "\\bsystem prompt\\b")
        .map { Regex(it, RegexOption.IGNORE_CASE) }

    /** Null when the reply is fine, otherwise the reason it was rejected. */
    fun checkReply(c: CaseFile, s: Suspect, reply: String): String? {
        if (reply.isBlank()) return "empty"
        if (breakChar.any { it.containsMatchIn(reply) }) return "broke character"
        if (confession.any { it.containsMatchIn(reply) }) return "confession"
        if (!s.isCulprit) {
            val first = Regex.escape(c.suspects.first { it.isCulprit }.name.split(" ")[0])
            if (Regex("\\b$first\\b[^.]{0,40}\\b(stole|took it|is the thief|did it|is guilty)\\b", RegexOption.IGNORE_CASE).containsMatchIn(reply)) return "named culprit"
            // Innocents may only talk about the culprit if their own facts mention them.
            val parts = c.suspects.first { it.isCulprit }.name.lowercase().split(" ").filter { it.length > 2 }
            if (s.knows.none { k -> parts.any { k.lowercase().contains(it) } } &&
                parts.any { Regex("\\b${Regex.escape(it)}\\b", RegexOption.IGNORE_CASE).containsMatchIn(reply) }) return "invented fact about culprit"
        }
        if (reply.trim().split(Regex("\\s+")).size > 90) return "too long"
        return null
    }

    fun score(c: CaseFile, suspectId: String, motive: String, clueId: String, questions: Int): Score {
        val culprit = suspectId == c.solution.culprit
        val mot = culprit && motive == c.solution.motive
        val clue = culprit && (clueId == c.solution.keyClue || c.clues.find { it.id == clueId }?.contradicts == c.solution.culprit)
        var p = (if (culprit) 60 else 0) + (if (mot) 20 else 0) + (if (clue) 20 else 0)
        if (culprit && questions <= 12) p += 10
        val rank = when { p >= 100 -> "Master Detective"; p >= 80 -> "Inspector"; p >= 60 -> "Sergeant"; else -> "Constable" }
        return Score(p, 110, culprit, mot, clue, rank)
    }
}
