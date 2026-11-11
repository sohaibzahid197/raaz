package app.raaz.detective

import org.junit.Assert.*
import org.junit.Test
import java.io.File

class TruthTest {
    private val cases = parseCases(File("src/main/assets/cases.json").readText())
    private val c = cases[0]
    private val sana = c.suspects.first { it.id == "sana" }
    private val farhan = c.suspects.first { it.id == "farhan" }

    @Test fun revealsClueByKeyword() {
        assertTrue(Truth.revealClues(c, "sana", "Who was at the back counter when the lights came back?", emptySet()).any { it.id == "c2" })
        assertTrue(Truth.revealClues(c, "mian", "When was the power cut?", emptySet()).isEmpty())
    }
    @Test fun flagsContradiction() = assertEquals(listOf("farhan" to "c2"), Truth.contradictions(c, setOf("c2")))
    @Test fun replyRules() {
        assertNull(Truth.checkReply(c, sana, "The lights went out at 7:10. I ran to the generator."))
        assertNotNull(Truth.checkReply(c, farhan, "Fine, I took the locket."))
        assertNotNull(Truth.checkReply(c, sana, "As an AI language model, I cannot say."))
        assertNotNull(Truth.checkReply(c, sana, "Farhan stole it, obviously."))
    }
    @Test fun scoring() {
        assertEquals(110, Truth.score(c, "farhan", "Gambling debt", "c2", 8).points)
        assertEquals(0, Truth.score(c, "sana", "Gambling debt", "c2", 5).points)
    }
    @Test fun allCasesHaveOneCulpritWithLie() = cases.forEach { k -> assertEquals(1, k.suspects.count { it.isCulprit && it.lie != null }) }
}
