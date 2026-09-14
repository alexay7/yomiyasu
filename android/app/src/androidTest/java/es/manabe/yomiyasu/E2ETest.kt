package es.manabe.yomiyasu

import android.content.Intent
import es.manabe.yomiyasu.app.MainActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.semantics.getOrNull
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.core.app.ActivityScenario
import org.junit.After
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Suite E2E contra un servidor real. Las credenciales y los ids se pasan como
 * argumentos de instrumentación, igual que las variables de entorno del iOS:
 *
 * adb shell am instrument -w \
 *   -e YOMIYASU_E2E_USER usuario -e YOMIYASU_E2E_PASSWORD contraseña \
 *   -e YOMIYASU_E2E_BOOK <id> -e YOMIYASU_E2E_NOVEL <id> -e YOMIYASU_E2E_SERIE <id> \
 *   es.manabe.yomiyasu.test/androidx.test.runner.AndroidJUnitRunner
 *
 * Si faltan credenciales, los tests se saltan.
 */
@RunWith(AndroidJUnit4::class)
class E2ETest {

    @get:Rule
    val composeRule = createEmptyComposeRule()

    private var scenario: ActivityScenario<MainActivity>? = null

    private val args = InstrumentationRegistry.getArguments()

    private val user: String? = args.getString("YOMIYASU_E2E_USER")
        ?: args.getString("user")
    private val password: String? = args.getString("YOMIYASU_E2E_PASSWORD")
        ?: args.getString("password")
    private val bookId: String? = args.getString("YOMIYASU_E2E_BOOK")
    private val novelId: String? = args.getString("YOMIYASU_E2E_NOVEL")
    private val serieId: String? = args.getString("YOMIYASU_E2E_SERIE")

    @Before
    fun requireCredentials() {
        assumeTrue(
            "Faltan YOMIYASU_E2E_USER / YOMIYASU_E2E_PASSWORD",
            !user.isNullOrEmpty() && !password.isNullOrEmpty(),
        )
    }

    @After
    fun tearDown() {
        scenario?.close()
        scenario = null
    }

    private fun launch(vararg extras: Pair<String, String>) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val intent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra("YOMIYASU_E2E_USER", user)
            putExtra("YOMIYASU_E2E_PASSWORD", password)
            putExtra("YOMIYASU_E2E_NO_SAVE", "1")
            extras.forEach { (key, value) -> putExtra(key, value) }
        }

        scenario = ActivityScenario.launch(intent)
    }

    @Test
    fun homeShowsLibrarySections() {
        launch()

        composeRule.waitUntil(timeoutMillis = 45_000) {
            composeRule.onAllNodesWithTag("homeList").fetchSemanticsNodes().isNotEmpty() ||
                composeRule.onAllNodesWithTag("loginScreen").fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.waitUntil(timeoutMillis = 45_000) {
            composeRule.onAllNodesWithText("En progreso").fetchSemanticsNodes().isNotEmpty() ||
                composeRule.onAllNodesWithText("Tu tablero").fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithTag("homeList").assertIsDisplayed()
    }

    private fun serieCards() = composeRule.onAllNodes(
        androidx.compose.ui.test.SemanticsMatcher("es una tarjeta de serie") { node ->
            node.config.getOrNull(androidx.compose.ui.semantics.SemanticsProperties.TestTag)
                ?.startsWith("serieCard-") == true
        },
    )

    @Test
    fun libraryShowsSerieCardsAndOpensDetail() {
        launch("YOMIYASU_E2E_SECTION" to "biblioteca")

        composeRule.waitUntil(timeoutMillis = 60_000) {
            serieCards().fetchSemanticsNodes().isNotEmpty()
        }

        serieCards().onFirst().performClick()

        composeRule.waitUntil(timeoutMillis = 60_000) {
            composeRule.onAllNodesWithTag("serieView").fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithTag("serieView").assertIsDisplayed()
    }

    @Test
    fun mangaReaderOpensAndShowsDictionaryFromPageText() {
        assumeTrue("Falta YOMIYASU_E2E_BOOK", !bookId.isNullOrEmpty())
        launch("YOMIYASU_E2E_BOOK" to bookId!!, "YOMIYASU_E2E_PAGE" to "30")

        composeRule.waitUntil(timeoutMillis = 60_000) {
            composeRule.onAllNodesWithTag("readerPageLabel").fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithTag("readerPageLabel").assertIsDisplayed()

        composeRule.onNodeWithTag("readerSlider").assertIsDisplayed()

        composeRule.waitUntil(timeoutMillis = 15_000) {
            composeRule.onAllNodesWithContentDescription("Texto").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithContentDescription("Texto").performClick()

        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodesWithTag("pageTextSheet").fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodesWithTag("pageTextParagraph").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onAllNodesWithTag("pageTextParagraph").onFirst().performClick()

        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodesWithTag("dictionaryResults").fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithTag("dictionaryResults").assertIsDisplayed()
    }

    @Test
    fun novelReaderOpensWithProgressLabel() {
        assumeTrue("Falta YOMIYASU_E2E_NOVEL", !novelId.isNullOrEmpty())
        launch("YOMIYASU_E2E_BOOK" to novelId!!)

        composeRule.waitUntil(timeoutMillis = 90_000) {
            composeRule.onAllNodesWithTag("novelProgressLabel").fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithTag("novelProgressLabel").assertIsDisplayed()
    }

    @Test
    fun moreSectionOpensSettings() {
        launch("YOMIYASU_E2E_SECTION" to "mas")

        composeRule.waitUntil(timeoutMillis = 45_000) {
            composeRule.onAllNodesWithText("Ajustes").fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onAllNodesWithText("Ajustes").onFirst().performClick()

        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodesWithTag("settingsList").fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithTag("settingsList").assertIsDisplayed()
    }
}
