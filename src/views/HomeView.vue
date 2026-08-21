<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { identity } from '@identity'
import AccSaberSection from '../components/AccSaberSection.vue'

const projects = [{ name: 'AccSaber', anchor: 'accsaber' }]

const mode = ref<'flat' | 'scene'>('flat')
const hasMorphed = ref(false)
const progress = ref(0)
const scrolled = ref(0)
const sectionOverride = ref<number | null>(null)
const entryYs = ref<number[]>([])
const labelY = ref(0)
const lastStopY = ref(Number.MAX_SAFE_INTEGER)
const spineX = ref(0)
const figureRef = ref<HTMLElement | null>(null)
const descentRef = ref<HTMLElement | null>(null)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let ticking = false
let unitPx = 1
let endScroll = 1
let maxTail = 0
let stemBottomAbs = 0

const tailLength = computed(() => progress.value * maxTail)
const openProgress = computed(() => Math.min(progress.value / 0.45, 1))
const heroTextFade = computed(() => Math.max(1 - progress.value / 0.08, 0))

function entryFraction(index: number): number {
  return 0.02 + ((index + 1) / (projects.length + 1)) * 0.22
}

function revealAt(pageY: number): number {
  if (reducedMotion) return 1
  const tipY = stemBottomAbs + tailLength.value * unitPx
  return Math.min(Math.max((tipY - pageY) / 70, 0), 1)
}

const reveals = computed(() =>
  projects.map((_, i) => revealAt(entryYs.value[i] ?? Number.MAX_SAFE_INTEGER)),
)
const labelReveal = computed(() => revealAt(labelY.value || Number.MAX_SAFE_INTEGER))
const pastHero = computed(() => scrolled.value > window.innerHeight * 0.4)
const showPageDown = computed(() => scrolled.value < lastStopY.value - 40)

function sceneSupported(): boolean {
  if (reducedMotion || !identity.scene) return false
  const probe = document.createElement('canvas')
  return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'))
}

function enterScene(): void {
  if (!sceneSupported()) return
  hasMorphed.value = true
  mode.value = 'scene'
}

function measure(): void {
  const figure = figureRef.value
  const descent = descentRef.value
  if (!figure || !descent) return
  const rect = figure.getBoundingClientRect()
  unitPx = rect.width / 128
  stemBottomAbs = rect.top + window.scrollY + (identity.spine.bottom / 128) * rect.height
  spineX.value = rect.left + (identity.spine.x / 128) * rect.width
  const descentBottom = descent.offsetTop + descent.offsetHeight
  endScroll = Math.max(descentBottom - window.innerHeight, 1)
  const railEnd = descentBottom - window.innerHeight * 0.2
  maxTail = Math.max((railEnd - stemBottomAbs) / unitPx, 0)
  entryYs.value = projects.map((_, i) => descent.offsetTop + entryFraction(i) * descent.offsetHeight)
  labelY.value = descent.offsetTop + 0.04 * descent.offsetHeight
  const lastAnchor = projects[projects.length - 1]
  const lastSection = lastAnchor ? document.getElementById(lastAnchor.anchor) : null
  if (lastSection) lastStopY.value = lastSection.getBoundingClientRect().top + window.scrollY
}

function fastScrollTo(targetY: number, onDone: () => void): void {
  const startY = window.scrollY
  const delta = targetY - startY
  const startTime = performance.now()
  const step = (now: number): void => {
    const t = Math.min((now - startTime) / 650, 1)
    const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
    window.scrollTo(0, startY + delta * eased)
    if (t < 1) requestAnimationFrame(step)
    else onDone()
  }
  requestAnimationFrame(step)
}

function playSectionEntrance(): void {
  const startTime = performance.now()
  const step = (now: number): void => {
    const t = Math.min((now - startTime) / 1100, 1)
    sectionOverride.value = t
    if (t < 1) requestAnimationFrame(step)
    else sectionOverride.value = null
  }
  requestAnimationFrame(step)
}

function goTo(targetY: number, entrance: boolean): void {
  if (reducedMotion) {
    window.scrollTo(0, targetY)
    return
  }
  if (entrance) {
    sectionOverride.value = 0
    fastScrollTo(targetY, playSectionEntrance)
  } else {
    fastScrollTo(targetY, () => {})
  }
}

function sectionTop(anchor: string): number | null {
  const target = document.getElementById(anchor)
  return target ? target.getBoundingClientRect().top + window.scrollY : null
}

function scrollToProject(anchor: string): void {
  const targetY = sectionTop(anchor)
  if (targetY !== null) goTo(targetY, true)
}

function pageStops(): { y: number; entrance: boolean }[] {
  const stops: { y: number; entrance: boolean }[] = [{ y: 0, entrance: false }]
  const firstEntry = entryYs.value[0]
  if (firstEntry !== undefined) {
    stops.push({ y: Math.max(firstEntry - window.innerHeight * 0.45, 0), entrance: false })
  }
  for (const project of projects) {
    const y = sectionTop(project.anchor)
    if (y !== null) stops.push({ y, entrance: true })
  }
  return stops
}

function pageDown(): void {
  const next = pageStops().find((stop) => stop.y > window.scrollY + 40)
  if (next) goTo(next.y, next.entrance)
}

function updateProgress(): void {
  scrolled.value = window.scrollY
  if (!reducedMotion) progress.value = Math.min(Math.max(window.scrollY / endScroll, 0), 1)
}

function onScroll(): void {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    updateProgress()
    ticking = false
  })
}

function onResize(): void {
  measure()
  updateProgress()
}

onMounted(() => {
  requestAnimationFrame(() => {
    measure()
    updateProgress()
  })
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <main class="home">
    <section class="hero">
      <div ref="figureRef" class="hero-figure">
        <Transition name="morph">
          <component
            :is="identity.hero"
            v-if="mode === 'flat'"
            :links="identity.links"
            :skip-intro="hasMorphed"
            :tail-length="tailLength"
            :open-progress="openProgress"
            class="hero-layer"
            @morph="enterScene"
          />
          <component :is="identity.scene" v-else class="hero-layer" @exit="mode = 'flat'" />
        </Transition>
      </div>
      <div class="hero-text" :style="{ opacity: heroTextFade }">
        <h1 class="name">{{ identity.name }}</h1>
        <p class="role">{{ identity.role }}</p>
      </div>
    </section>
    <div ref="descentRef" class="descent" :style="{ '--spine': `${spineX}px` }">
      <p
        class="section-label"
        :style="{ top: '4%', '--reveal': `${labelReveal}` }"
        aria-hidden="true"
      >
        Projects
      </p>
      <nav class="index" aria-label="Projects">
        <a
          v-for="(project, i) in projects"
          :key="project.anchor"
          class="index-entry"
          :class="i % 2 ? 'left' : 'right'"
          :href="`#${project.anchor}`"
          :style="{
            top: `${entryFraction(i) * 100}%`,
            '--reveal': `${reveals[i] ?? 0}`,
            pointerEvents: (reveals[i] ?? 0) > 0.6 ? 'auto' : 'none',
          }"
          :tabindex="(reveals[i] ?? 0) > 0.6 ? 0 : -1"
          @click.prevent="scrollToProject(project.anchor)"
        >
          <span class="branch"></span>
          <span class="label">{{ project.name }}</span>
        </a>
      </nav>
    </div>
    <AccSaberSection id="accsaber" :progress-override="sectionOverride" />
    <button
      v-if="showPageDown"
      class="page-down"
      :class="{ 'on-dark': pastHero }"
      aria-label="Next section"
      @click="pageDown"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M4 9 L12 17 L20 9" fill="none" stroke="currentColor" stroke-width="2.5" />
      </svg>
    </button>
  </main>
</template>

<style scoped>
.hero {
  position: relative;
  z-index: 1;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 24px;
}

.descent {
  --index-type: clamp(2rem, 7vw, 3.2rem);
  position: relative;
  height: 130vh;
  background: linear-gradient(to bottom, var(--ground), #141414);
}

.section-label {
  position: absolute;
  right: calc(100% - var(--spine) + 44px);
  margin: 0;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: calc(var(--index-type) * 0.75);
  letter-spacing: 0.04em;
  color: var(--figure);
  opacity: var(--reveal);
  transform: translateY(-50%) translateX(calc((1 - var(--reveal)) * 46px));
}

.page-down {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  padding: 10px;
  background: none;
  border: none;
  color: var(--figure);
  opacity: 0.7;
  cursor: pointer;
  transition: opacity 150ms ease-out, color 150ms ease-out;
}

.page-down:hover {
  opacity: 1;
  color: var(--accent);
}

.page-down:focus-visible {
  opacity: 1;
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.page-down.on-dark {
  color: var(--paper);
}

.page-down.on-dark:hover {
  color: var(--accent);
}

.index-entry {
  position: absolute;
  display: flex;
  align-items: center;
  text-decoration: none;
  opacity: var(--reveal);
  outline: none;
}

.index-entry.right {
  left: var(--spine);
  transform: translateY(-50%) translateX(calc((1 - var(--reveal)) * -28px));
}

.index-entry.left {
  right: calc(100% - var(--spine));
  flex-direction: row-reverse;
  transform: translateY(-50%) translateX(calc((1 - var(--reveal)) * 28px));
}

.branch {
  width: clamp(36px, 8vw, 130px);
  height: 16px;
  background: var(--figure);
}

.label {
  font-family: var(--font-play);
  font-size: var(--index-type);
  line-height: 1;
  color: var(--figure);
  padding: 0 clamp(8px, 2vw, 16px);
}

.index-entry:hover .label,
.index-entry:focus-visible .label {
  color: var(--accent);
}

.index-entry:focus-visible .branch {
  background: var(--accent);
}

.hero-figure {
  position: relative;
  width: min(44vh, 72vw);
  aspect-ratio: 1;
}

.hero-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.morph-enter-active,
.morph-leave-active {
  transition: opacity 160ms ease-out;
}

.morph-enter-from,
.morph-leave-to {
  opacity: 0;
}

.hero-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.name {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 640;
  font-size: clamp(2rem, 6vw, 3.2rem);
  letter-spacing: 0.02em;
  animation: fade-up 0.5s var(--ease-out) 1.3s both;
}

.role {
  margin: 0;
  font-family: var(--font-play);
  font-size: 2.1rem;
  line-height: 1;
  opacity: 0.75;
  animation: fade-up-soft 0.5s var(--ease-out) 1.45s both;
}

@keyframes fade-up {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fade-up-soft {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 0.75;
  }
}

@media (prefers-reduced-motion: reduce) {
  .name,
  .role {
    animation: none;
  }

  .morph-enter-active,
  .morph-leave-active {
    transition: none;
  }
}
</style>
