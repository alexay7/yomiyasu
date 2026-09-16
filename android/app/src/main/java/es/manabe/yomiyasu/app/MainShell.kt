package es.manabe.yomiyasu.app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.NavType
import es.manabe.yomiyasu.app.ui.Routes
import es.manabe.yomiyasu.core.models.LibraryVariant
import es.manabe.yomiyasu.core.models.MainView

private data class TabItem(
    val route: String,
    val label: String,
    val icon: ImageVector,
)

@Composable
fun MainShell(
    mainView: MainView,
    isSocketConnected: Boolean,
    onMarkLibraryUpdated: () -> Unit,
    onLogout: () -> Unit,
) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val immersive = currentRoute?.startsWith("book/") == true

    val expanded = LocalConfiguration.current.screenWidthDp >= 600

    val startRoute = remember {
        when {
            DebugConfig.e2eBook != null -> Routes.book(DebugConfig.e2eBook!!)
            DebugConfig.e2eSerie != null -> Routes.serie(DebugConfig.e2eSerie!!)
            else -> when (DebugConfig.e2eSection?.lowercase()) {
                "biblioteca", "library" -> Routes.Library
                "lista", "readlist" -> Routes.Readlist
                "palabras", "words" -> Routes.Words
                "mas", "more" -> Routes.More
                else -> Routes.Home
            }
        }
    }

    val tabs = buildList {
        add(TabItem(Routes.Home, "Inicio", Icons.Filled.Home))
        add(TabItem(Routes.Library, "Biblioteca", Icons.AutoMirrored.Filled.MenuBook))
        add(TabItem(Routes.Readlist, "Lista", Icons.Filled.FavoriteBorder))
        add(TabItem(Routes.Words, "Palabras", Icons.Filled.Translate))
        add(TabItem(Routes.More, "Más", Icons.Filled.MoreHoriz))
    }

    if (expanded) {
        androidx.compose.foundation.layout.Row(modifier = Modifier.fillMaxSize()) {
            if (!immersive) {
                NavigationRail {
                    tabs.forEach { tab ->
                        NavigationRailItem(
                            selected = currentRoute == tab.route,
                            onClick = { navController.navigateTopLevel(tab.route) },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
            Box(modifier = Modifier.weight(1f)) {
                ShellNavHost(
                    navController = navController,
                    startRoute = startRoute,
                    mainView = mainView,
                    isSocketConnected = isSocketConnected,
                    onMarkLibraryUpdated = onMarkLibraryUpdated,
                    onLogout = onLogout,
                )
            }
        }
    } else {
        Scaffold(
            bottomBar = {
                if (!immersive) {
                    NavigationBar {
                        tabs.forEach { tab ->
                            NavigationBarItem(
                                selected = currentRoute == tab.route,
                                onClick = { navController.navigateTopLevel(tab.route) },
                                icon = { Icon(tab.icon, contentDescription = tab.label) },
                                label = { Text(tab.label) },
                            )
                        }
                    }
                }
            },
        ) { padding ->
            Box(modifier = Modifier.fillMaxSize().padding(padding)) {
                ShellNavHost(
                    navController = navController,
                    startRoute = startRoute,
                    mainView = mainView,
                    isSocketConnected = isSocketConnected,
                    onMarkLibraryUpdated = onMarkLibraryUpdated,
                    onLogout = onLogout,
                )
            }
        }
    }
}

private fun NavHostController.navigateTopLevel(route: String) {
    navigate(route) {
        popUpTo(Routes.Home) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

@Composable
private fun ShellNavHost(
    navController: NavHostController,
    startRoute: String,
    mainView: MainView,
    isSocketConnected: Boolean,
    onMarkLibraryUpdated: () -> Unit,
    onLogout: () -> Unit,
) {
    NavHost(navController = navController, startDestination = startRoute) {
        composable(Routes.Home) {
            es.manabe.yomiyasu.features.home.HomeRoute(
                mainView = mainView,
                onOpenSerie = { navController.navigate(Routes.serie(it)) },
                onOpenBook = { navController.navigate(Routes.book(it)) },
                onMarkLibraryUpdated = onMarkLibraryUpdated,
            )
        }
        composable(Routes.Library) {
            es.manabe.yomiyasu.features.library.LibraryRoute(
                mainView = mainView,
                onOpenSerie = { navController.navigate(Routes.serie(it)) },
                onOpenBook = { navController.navigate(Routes.book(it)) },
                onOpenRandomSerie = { id, variant ->
                    navController.navigate(Routes.serie(id, variant.rawValue))
                },
            )
        }
        composable(Routes.Readlist) {
            es.manabe.yomiyasu.features.readlist.ReadlistRoute(
                mainView = mainView,
                onOpenSerie = { navController.navigate(Routes.serie(it)) },
                onOpenBook = { navController.navigate(Routes.book(it)) },
            )
        }
        composable(Routes.Words) {
            es.manabe.yomiyasu.features.words.WordsRoute()
        }
        composable(Routes.More) {
            es.manabe.yomiyasu.features.more.MoreRoute(
                isSocketConnected = isSocketConnected,
                onOpenHistory = { navController.navigate(Routes.History) },
                onOpenCalendar = { navController.navigate(Routes.Calendar) },
                onOpenStats = { navController.navigate(Routes.Stats) },
                onOpenDownloads = { navController.navigate(Routes.Downloads) },
                onOpenSettings = { navController.navigate(Routes.Settings) },
                onOpenAccount = { navController.navigate(Routes.Account) },
            )
        }
        composable(Routes.History) {
            es.manabe.yomiyasu.features.history.HistoryRoute()
        }
        composable(Routes.Calendar) {
            es.manabe.yomiyasu.features.history.CalendarRoute()
        }
        composable(Routes.Stats) {
            es.manabe.yomiyasu.features.stats.StatsRoute()
        }
        composable(Routes.Downloads) {
            es.manabe.yomiyasu.features.downloads.DownloadsRoute(
                onOpenBook = { navController.navigate(Routes.book(it)) },
            )
        }
        composable(Routes.Settings) {
            es.manabe.yomiyasu.features.settings.SettingsRoute(
                isSocketConnected = isSocketConnected,
                onOpenAccount = { navController.navigate(Routes.Account) },
                onLogout = onLogout,
            )
        }
        composable(Routes.Account) {
            es.manabe.yomiyasu.features.settings.AccountRoute(
                onLogout = onLogout,
            )
        }
        composable(
            route = Routes.SeriePattern,
            arguments = listOf(
                navArgument("serieId") { type = NavType.StringType },
                navArgument("randomVariant") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
            ),
        ) { entry ->
            val serieId = entry.arguments?.getString("serieId").orEmpty()
            val randomVariant = entry.arguments?.getString("randomVariant")
                ?.let { raw -> LibraryVariant.entries.firstOrNull { it.rawValue == raw } }
            es.manabe.yomiyasu.features.serie.SerieRoute(
                serieId = serieId,
                randomVariant = randomVariant,
                onOpenBook = { navController.navigate(Routes.book(it)) },
                onBack = { navController.popBackStack() },
            )
        }
        composable(
            route = Routes.BookPattern,
            arguments = listOf(navArgument("bookId") { type = NavType.StringType }),
        ) { entry ->
            val bookId = entry.arguments?.getString("bookId").orEmpty()
            es.manabe.yomiyasu.features.reader.BookReaderRoute(
                bookId = bookId,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
