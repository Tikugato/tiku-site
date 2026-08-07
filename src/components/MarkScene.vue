<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { MarkScene as SceneController } from '../scene/markScene'

const emit = defineEmits<{ exit: [] }>()

const hostRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let controller: SceneController | null = null
let resizeObserver: ResizeObserver | null = null
let darkQuery: MediaQueryList | null = null
let lastPointer: { x: number; y: number; time: number } | null = null

function onPointerMove(event: PointerEvent): void {
  const nx = (event.clientX / window.innerWidth) * 2 - 1
  const ny = (event.clientY / window.innerHeight) * 2 - 1
  const now = performance.now()
  const speed = lastPointer
    ? Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) /
      Math.max(now - lastPointer.time, 8)
    : 0
  lastPointer = { x: event.clientX, y: event.clientY, time: now }
  controller?.pointerMove(nx, ny, speed)
}

function onVisibility(): void {
  if (document.hidden) controller?.stop()
  else controller?.start()
}

function applyTheme(): void {
  controller?.setTheme(darkQuery?.matches ?? false)
}

function leave(): void {
  controller?.setMorphTarget(0)
}

async function boot(): Promise<void> {
  const canvas = canvasRef.value
  const host = hostRef.value
  if (!canvas || !host) return
  const { MarkScene } = await import('../scene/markScene')
  controller = new MarkScene(canvas)
  controller.onMorphSettled = (target) => {
    if (target === 0) emit('exit')
  }
  darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  controller.setTheme(darkQuery.matches)
  darkQuery.addEventListener('change', applyTheme)
  resizeObserver = new ResizeObserver(() => {
    if (host.clientWidth && host.clientHeight) controller?.resize(host.clientWidth, host.clientHeight)
  })
  resizeObserver.observe(host)
  controller.resize(host.clientWidth, host.clientHeight)
  window.addEventListener('pointermove', onPointerMove)
  document.addEventListener('visibilitychange', onVisibility)
  controller.start()
  window.setTimeout(() => controller?.setMorphTarget(1), 300)
}

onMounted(() => {
  void boot()
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('visibilitychange', onVisibility)
  darkQuery?.removeEventListener('change', applyTheme)
  resizeObserver?.disconnect()
  controller?.dispose()
})
</script>

<template>
  <div ref="hostRef" class="mark-stage">
    <canvas ref="canvasRef" class="mark-canvas" aria-hidden="true"></canvas>
    <button class="mark-exit" aria-label="Back to the flat mark" @click="leave"></button>
  </div>
</template>

<style scoped>
.mark-stage {
  position: relative;
  width: 100%;
  height: 100%;
}

.mark-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.mark-exit {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.mark-exit:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
</style>
