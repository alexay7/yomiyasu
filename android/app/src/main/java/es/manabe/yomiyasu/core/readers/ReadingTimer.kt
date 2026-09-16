package es.manabe.yomiyasu.core.readers

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class ReadingTimer(
    private val scope: CoroutineScope,
    private val now: () -> Long = { System.currentTimeMillis() },
) {
    private val _seconds = MutableStateFlow(0)
    val seconds: StateFlow<Int> = _seconds.asStateFlow()

    private val _isRunning = MutableStateFlow(false)
    val isRunning: StateFlow<Boolean> = _isRunning.asStateFlow()

    /** Minutos sin actividad de lectura tras los que se pausa el cronómetro. 0 lo desactiva. */
    var idleTimeoutMinutes: Int = 0

    private var tickJob: Job? = null
    private var lastTick: Long? = null
    private var lastActivity: Long = now()
    private var idlePaused = false
    private var wasRunning = false

    fun start() {
        if (_isRunning.value) return
        _isRunning.value = true
        lastTick = now()

        tickJob?.cancel()
        tickJob = scope.launch {
            while (isActive) {
                delay(1_000)
                tick()
            }
        }
    }

    fun pause() {
        flushSeconds()
        _isRunning.value = false
        wasRunning = false
        tickJob?.cancel()
        tickJob = null
        lastTick = null
    }

    fun resume(fromSeconds: Int) {
        _seconds.value = maxOf(0, fromSeconds)
        lastTick = null
    }

    fun reset() {
        pause()
        _seconds.value = 0
    }

    fun add(minutes: Int) {
        _seconds.value = maxOf(0, _seconds.value + minutes * 60)
    }

    /** Registra actividad de lectura y reanuda el cronómetro si se pausó por inactividad. */
    fun notifyActivity() {
        lastActivity = now()

        if (idlePaused) {
            idlePaused = false
            start()
        }
    }

    fun formatted(): String {
        val total = _seconds.value
        val hours = total / 3600
        val minutes = (total % 3600) / 60
        val secs = total % 60

        return if (hours > 0) {
            String.format("%d:%02d:%02d", hours, minutes, secs)
        } else {
            String.format("%02d:%02d", minutes, secs)
        }
    }

    fun tick() {
        flushSeconds()
        evaluateIdle()
    }

    private fun flushSeconds() {
        val last = lastTick ?: return
        val delta = ((now() - last) / 1000).toInt()
        lastTick = now()
        _seconds.value += maxOf(0, delta)
    }

    private fun evaluateIdle() {
        if (idleTimeoutMinutes <= 0) return

        // Reanudación (manual o automática): el tiempo de inactividad cuenta de nuevo
        if (_isRunning.value && !wasRunning) {
            lastActivity = now()
            idlePaused = false
        }

        wasRunning = _isRunning.value

        if (_isRunning.value && !idlePaused &&
            now() - lastActivity >= idleTimeoutMinutes * 60_000L
        ) {
            idlePaused = true
            pause()
        }
    }
}
