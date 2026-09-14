package es.manabe.yomiyasu.core.networking

import java.time.Instant
import java.time.OffsetDateTime

object IsoDate {
    fun parse(value: String?): Instant? {
        if (value.isNullOrBlank()) return null
        return try {
            Instant.parse(value)
        } catch (_: Exception) {
            try {
                OffsetDateTime.parse(value).toInstant()
            } catch (_: Exception) {
                null
            }
        }
    }
}
