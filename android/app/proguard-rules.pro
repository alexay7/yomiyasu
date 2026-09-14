# Reglas R8 para Yomiyasu

# kotlinx.serialization (además de las reglas del consumer del plugin)
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class es.manabe.yomiyasu.**$$serializer { *; }
-keepclassmembers class es.manabe.yomiyasu.** {
    *** Companion;
}
-keepclasseswithmembers class es.manabe.yomiyasu.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# socket.io-client / engine.io-client (usa reflexión para eventos y transporte)
-keep class io.socket.** { *; }
-dontwarn io.socket.**
-dontwarn org.json.**

# OkHttp / Okio
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Readium (WebView, scripts inyectados y serialización interna)
-keep class org.readium.r2.** { *; }
-dontwarn org.readium.r2.**

# Jsoup
-keep class org.jsoup.** { *; }
-dontwarn org.jsoup.**
