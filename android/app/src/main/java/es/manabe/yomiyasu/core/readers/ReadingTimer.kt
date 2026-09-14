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
) {
    private val _seconds = MutableStateFlow(0)
    val seconds: StateFlow<Int> = _seconds.asStateFlow()

    private val _isRunning = MutableStateFlow(false)
    val isRunning: StateFlow<Boolean> = _isRunning.asStateFlow()

    private var tickJob: Job? = null
    private var lastTick: Long? = null

    fun start() {
        if (_isRunning.value) return
        _isRunning.value = true
        lastTick = System.currentTimeMillis()

        tickJob?.cancel()
        tickJob = scope.launch {
            while (isActive) {
                delay(1_000)
                tick()
            }
        }
    }

    fun pause() {
        tick()
        _isRunning.value = false
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

    private fun tick() {
        val last = lastTick ?: return
        val delta = ((System.currentTimeMillis() - last) / 1000).toInt()
        lastTick = System.currentTimeMillis()
        _seconds.value += maxOf(0, delta)
    }
}
