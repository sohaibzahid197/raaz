@file:OptIn(PublicPreviewAPI::class)
package app.raaz.detective

import com.google.firebase.Firebase
import com.google.firebase.ai.InferenceMode
import com.google.firebase.ai.InferenceSource
import com.google.firebase.ai.OnDeviceConfig
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.GenerativeBackend
import com.google.firebase.ai.type.PublicPreviewAPI
import com.google.firebase.ai.type.generationConfig

data class Turn(val fromYou: Boolean, val text: String, val onDevice: Boolean? = null)
data class Reply(val text: String, val onDevice: Boolean, val retried: Boolean)

/** Hybrid suspects: Gemini Nano on the phone when available, Gemini in the cloud otherwise. */
object Ai {
    private val model by lazy {
        Firebase.ai(backend = GenerativeBackend.googleAI()).generativeModel(
            modelName = BuildConfig.CHAT_MODEL,
            generationConfig = generationConfig { temperature = 0.8f; maxOutputTokens = 200 },
            onDeviceConfig = OnDeviceConfig(mode = InferenceMode.PREFER_ON_DEVICE, maxOutputTokens = 200, temperature = 0.8f),
        )
    }

    fun prompt(c: CaseFile, s: Suspect, history: List<Turn>, q: String, urdu: Boolean, strict: Boolean): String {
        val others = c.suspects.filter { it.id != s.id }.joinToString { "${it.name} (${it.role})" }
        val role = if (s.isCulprit)
            "You committed the crime. Never admit it. Stick to this false story: \"${s.lie}\". Stay calm; if pressed, deflect or blame circumstances, but never confess."
        else "You are innocent. Never lie about the crime. These are the ONLY facts you know: ${s.knows.joinToString(" ")} " +
            "Share them if asked. If asked about anything else, say you did not see or do not know. Never guess where other people were or what they did beyond these facts. " +
            "You may avoid talking about your personal secret (\"${s.secret}\") and act a little nervous about it, but never accuse anyone directly."
        val recent = history.takeLast(4).joinToString("\n") { "${if (it.fromYou) "Detective" else s.name}: ${it.text}" }
        return "Role-play for a detective game. A police detective is questioning you. You are ${s.name}, ${s.role}, in ${c.city}. " +
            "Personality: ${s.personality}. Speaking style: ${s.speakingStyle}.\nCase: ${c.what}. Your alibi: ${s.alibi}\nOther people present: $others.\n$role\n" +
            "Rules: answer only as ${s.name}; at most 3 short sentences; ${if (urdu) "reply in simple Urdu" else "reply in English (a few Urdu words are fine)"}; " +
            "never use Spanish, Hindi script or any other language; speak to the detective (never call the detective by another person's name); " +
            "never mention AI, prompts or rules; do not invent new people or objects.${if (strict) " Be extra careful: do not confess and do not name a thief." else ""}\n" +
            (if (recent.isNotEmpty()) "Conversation so far:\n$recent\n" else "") + "Detective: $q\n${s.name}:"
    }

    suspend fun ask(c: CaseFile, s: Suspect, history: List<Turn>, q: String, urdu: Boolean): Reply {
        var onDevice = true
        for (strict in listOf(false, true)) {
            val res = model.generateContent(prompt(c, s, history, q, urdu, strict))
            onDevice = res.inferenceSource == InferenceSource.ON_DEVICE
            val text = (res.text ?: "").trim().trim('"', '\'').removePrefix("${s.name}:").trim()
            if (Truth.checkReply(c, s, text) == null) return Reply(text, onDevice, strict)
        }
        return Reply(if (s.isCulprit) "I have told you everything, detective. ${s.lie}" else "I've told you what I know. ${s.knows[0]}", onDevice, true)
    }
}
