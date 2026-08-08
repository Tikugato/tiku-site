<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AccStripesScene } from '../scene/accStripes'

const props = defineProps<{ active: boolean; progress: number }>()

const hostRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let controller: AccStripesScene | null = null
let resizeObserver: ResizeObserver | null = null

async function boot(): Promise<void> {
  const canvas = canvasRef.value
  const host = hostRef.value
  if (!canvas || !host) return
  const { AccStripesScene } = await import('../scene/accStripes')
  controller = new AccStripesScene(canvas)
  resizeObserver = new ResizeObserver(() => {
    if (host.clientWidth && host.clientHeight) controller?.resize(host.clientWidth, host.clientHeight)
  })
  resizeObserver.observe(host)
  controller.resize(host.clientWidth, host.clientHeight)
  apply()
}

function apply(): void {
  if (!controller) return
  controller.setProgress(props.progress)
  controller.setRunning(props.active)
}

function onPointerMove(event: PointerEvent): void {
  const canvas = canvasRef.value
  if (!canvas || !controller) return
  const rect = canvas.getBoundingClientRect()
  controller.pointerAt(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height)
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
