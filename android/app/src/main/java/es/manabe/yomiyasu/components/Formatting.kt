package es.manabe.yomiyasu.components

import java.text.NumberFormat
import java.util.Locale

private val numberFormat: NumberFormat = NumberFormat.getIntegerInstance(Locale("es", "ES"))

fun formatNumber(value: Int): String = numberFormat.format(value.toLong())

/** Duración en segundos → «1 h 5 min», «5 min», «42 s». */
fun durationText(seconds: Int): String {
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60

    return when {
        hours > 0 -> "$hours h $minutes min"
        minutes > 0 -> "$minutes min"
        else -> "$seconds s"
    }
}
