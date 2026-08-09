<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AccStripesScene } from '../scene/accStripes'

const props = defineProps<{ active: boolean; progress: number }>()

const hostRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let controller: AccStripesScene | null = null
let resizeObserver: ResizeObserver | null = null
let pageTop = 0
let pageLeft = 0
let stageWidth = 1
let stageHeight = 1
let pointerX = 0
let pointerY = 0
let pointerQueued = false

function measureStage(host: HTMLElement): void {
  const rect = host.getBoundingClientRect()
  pageTop = rect.top + window.scrollY
  pageLeft = rect.left + window.scrollX
  stageWidth = Math.max(rect.width, 1)
  stageHeight = Math.max(rect.height, 1)
  controller?.resize(stageWidth, stageHeight)
}

async function boot(): Promise<void> {
  const canvas = canvasRef.value
  const host = hostRef.value
  if (!canvas || !host) return
  const { AccStripesScene } = await import('../scene/accStripes')
  controller = new AccStripesScene(canvas)
  resizeObserver = new ResizeObserver(() => measureStage(host))
  resizeObserver.observe(host)
  measureStage(host)
  apply()
}

function apply(): void {
  if (!controller) return
  controller.setProgress(props.progress)
  controller.setRunning(props.active)
}

function processPointer(): void {
  pointerQueued = false
  controller?.pointerAt(
    pointerX - pageLeft,
    pointerY - (pageTop - window.scrollY),
    stageWidth,
    stageHeight,
  )
}

function onPointerMove(event: PointerEvent): void {
  pointerX = event.clientX
  pointerY = event.clientY
  if (pointerQueued) return
  pointerQueued = true
  requestAnimationFrame(processPointer)
}

function onPointerLeave(): void {
  controller?.clearPointer()
}

watch(() => [props.active, props.progress], apply)

onMounted(() => {
  void boot()
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('pointerleave', onPointerLeave)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerleave', onPointerLeave)
  resizeObserver?.disconnect()
  controller?.dispose()
})
</script>

<template>
  <div ref="hostRef" class="stripes-stage" aria-hidden="true">
    <canvas ref="canvasRef" class="stripes-canvas"></canvas>
  </div>
</template>

<style scoped>
.stripes-stage {
  position: absolute;
  top: -130vh;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.stripes-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
