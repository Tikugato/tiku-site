<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { siDiscord, siGithub, siX } from 'simple-icons'
import AccSaberSection from '../components/AccSaberSection.vue'
import HeroMark from '../components/HeroMark.vue'
import MarkScene from '../components/MarkScene.vue'
import { STEM } from '../scene/markShape'

const socials = [
  { name: 'GitHub', url: 'https://github.com/Tikugato', iconPath: siGithub.path },
  { name: 'Discord', copyText: 'tikugato', iconPath: siDiscord.path },
  { name: 'X', url: 'https://x.com/Tikugato', iconPath: siX.path },
]

const projects = [{ name: 'AccSaber', anchor: 'accsaber' }]

const mode = ref<'flat' | 'scene'>('flat')
const hasMorphed = ref(false)
const progress = ref(0)
const sectionOverride = ref<number | null>(null)
const entryYs = ref<number[]>([])
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

const reveals = computed(() => {
  if (reducedMotion) return projects.map(() => 1)
  const tipY = stemBottomAbs + tailLength.value * unitPx
  return projects.map((_, i) => {
    const entryY = entryYs.value[i] ?? Number.MAX_SAFE_INTEGER
    return Math.min(Math.max((tipY - entryY) / 70, 0), 1)
  })
})

function sceneSupported(): boolean {
  if (reducedMotion) return false
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
  stemBottomAbs = rect.top + window.scrollY + (STEM.bottom / 128) * rect.height
  const descentBottom = descent.offsetTop + descent.offsetHeight
  endScroll = Math.max(descentBottom - window.innerHeight, 1)
  const railEnd = descentBottom - window.innerHeight * 0.2
  maxTail = Math.max((railEnd - stemBottomAbs) / unitPx, 0)
  entryYs.value = projects.map((_, i) => descent.offsetTop + entryFraction(i) * descent.offsetHeight)
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

function scrollToProject(anchor: string): void {
  const target = document.getElementById(anchor)
  if (!target) return
  const targetY = target.getBoundingClientRect().top + window.scrollY
  if (reducedMotion) {
    window.scrollTo(0, targetY)
    return
  }
  sectionOverride.value = 0
  fastScrollTo(targetY, playSectionEntrance)
}

function updateProgress(): void {
  progress.value = Math.min(Math.max(window.scrollY / endScroll, 0), 1)
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
  if (reducedMotion) return
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
          <HeroMark
            v-if="mode === 'flat'"
            :socials="socials"
            :skip-intro="hasMorphed"
            :tail-length="tailLength"
            :open-progress="openProgress"
            class="hero-layer"
            @morph="enterScene"
          />
          <MarkScene v-else class="hero-layer" @exit="mode = 'flat'" />
        </Transition>
      </div>
      <div class="hero-text" :style="{ opacity: heroTextFade }">
        <h1 class="name">Tiku</h1>
        <p class="role">Software Developer</p>
      </div>
    </section>
    <div ref="descentRef" class="descent">
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
  position: relative;
  height: 130vh;
  background: linear-gradient(to bottom, var(--ground), #141414);
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
  left: 50%;
  transform: translateY(-50%) translateX(calc((1 - var(--reveal)) * -28px));
}

.index-entry.left {
  right: 50%;
  flex-direction: row-reverse;
  transform: translateY(-50%) translateX(calc((1 - var(--reveal)) * 28px));
}

.branch {
  width: clamp(48px, 7vw, 110px);
  height: 12px;
  background: var(--figure);
}

.label {
  font-family: var(--font-play);
  font-size: 2.2rem;
  line-height: 1;
  color: var(--figure);
  padding: 0 14px;
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
