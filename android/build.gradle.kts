// AGP 9 usa Kotlin integrado (built-in Kotlin). Para fijar una versión de Kotlin
// superior a la incluida por AGP hay que declararla en el classpath del buildscript
// (mantener sincronizada con `kotlin` en gradle/libs.versions.toml).
buildscript {
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.10")
    }
}

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}
