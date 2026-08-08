<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import accLogo from '../assets/acc-logo.png'
import AccStripes from './AccStripes.vue'

const props = defineProps<{ progressOverride?: number | null }>()

const sectionRef = ref<HTMLElement | null>(null)
const fill = ref(0)
const stripeFill = ref(0)
const active = ref(false)
const effectiveFill = computed(() => props.progressOverride ?? fill.value)
const visible = computed(() => effectiveFill.value >= 0.9)
const stripeProgress = computed(() => props.progressOverride ?? stripeFill.value)
let ticking = false

function stripesSupported(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  const probe = document.createElement('canvas')
  return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'))
}

const useScene = stripesSupported()

function updateFill(): void {
  const section = sectionRef.value
  if (!section) return
  const rect = section.getBoundingClientRect()
  const vh = window.innerHeight
  active.value = rect.bottom > 0 && rect.top < vh * 1.3
  fill.value = Math.min(Math.max((vh - rect.top) / vh, 0), 1)
  stripeFill.value = Math.min(Math.max((vh * 1.3 - rect.top) / (vh * 1.3), 0), 1)
}

function onScroll(): void {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    updateFill()
    ticking = false
  })
}

const repos = [
  { name: 'Frontend', url: 'https://github.com/accsaber/accsaber-reloaded-frontend' },
  { name: 'Backend', url: 'https://github.com/accsaber/accsaber-reloaded-backend' },
  { name: 'Criteria script', url: 'https://github.com/accsaber/accsaber-complexity-script' },
  { name: 'Bot', url: 'https://github.com/accsaber/accsaber-bot' },
  { name: 'Plugin', url: 'https://github.com/not-dexter/accsaber-reloaded-plugin' },
  { name: 'Plugin (Quest)', url: 'https://github.com/accsaber/accsaber-qlite-plugin' },
]

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  updateFill()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <section ref="sectionRef" class="accsaber" :class="{ visible, scene: useScene }">
    <AccStripes v-if="useScene" :active="active" :progress="stripeProgress" />
    <div v-else class="stripes" aria-hidden="true">
      <span class="stripe blue"></span>
      <span class="stripe red"></span>
      <span class="stripe green"></span>
    </div>
    <div class="content">
      <img class="logo" :src="accLogo" alt="" width="170" height="170" />
      <h2 class="title">AccSaber</h2>
      <p class="tagline">The accuracy leaderboard for Beat Saber.</p>
      <a class="visit" href="https://accsaber.com" target="_blank" rel="noopener">accsaber.com</a>
      <ul class="repos">
        <li v-for="repo in repos" :key="repo.name">
          <a :href="repo.url" target="_blank" rel="noopener">{{ repo.name }}</a>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.accsaber.scene {
  overflow: visible;
}

.accsaber {
  --acc-black: #141414;
  --acc-white: #f0f0f0;
  --acc-red: #e5352f;
  --acc-blue: #2492e0;
  --acc-green: #31c93d;
  position: relative;
  z-index: 2;
  min-height: 100dvh;
  overflow: hidden;
  background: var(--acc-black);
  color: var(--acc-white);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 48px clamp(24px, 12vw, 180px) 48px 24px;
}

.stripes {
  position: absolute;
  inset: 0;
}

.stripe {
  position: absolute;
  left: -55%;
  width: 130%;
  height: clamp(150px, 26vh, 250px);
  transition: transform 700ms var(--ease-out);
}

.stripe.blue {
  top: -18%;
  background: var(--acc-blue);
  transform: rotate(-30deg) translateX(-130%);
}

.stripe.red {
  top: 12%;
  background: var(--acc-red);
  transform: rotate(-30deg) translateX(-130%);
  transition-delay: 140ms;
}

.stripe.green {
  top: 42%;
  background: var(--acc-green);
  transform: rotate(-30deg) translateX(-130%);
  transition-delay: 280ms;
}

.visible .stripe {
  transform: rotate(-30deg) translateX(0);
}

.content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-top: clamp(60px, 20vh, 240px);
  text-align: left;
  text-shadow: 0 1px 10px rgb(0 0 0 / 0.55);
}

.content img {
  filter: drop-shadow(0 2px 10px rgb(0 0 0 / 0.45));
}

.content > * {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 500ms var(--ease-out), transform 500ms var(--ease-out);
}

.visible .content > * {
  opacity: 1;
  transform: translateY(0);
}

.visible .content > *:nth-child(1) {
  transition-delay: 420ms;
}

.visible .content > *:nth-child(2) {
  transition-delay: 520ms;
}

.visible .content > *:nth-child(3) {
  transition-delay: 620ms;
}

.visible .content > *:nth-child(4) {
  transition-delay: 720ms;
}

.visible .content > *:nth-child(5) {
  transition-delay: 820ms;
}

.logo {
  width: clamp(120px, 18vh, 170px);
  height: auto;
}

.title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(2.6rem, 8vw, 4.4rem);
  letter-spacing: 0.02em;
}

.tagline {
  margin: 0;
  font-family: var(--font-play);
  font-size: 2rem;
  line-height: 1;
}

.visit {
  font-family: var(--font-play);
  font-size: 2.2rem;
  line-height: 1.1;
  color: var(--acc-white);
  text-decoration: none;
  border-bottom: 3px solid var(--acc-green);
}

.visit:hover,
.visit:focus-visible {
  color: var(--acc-green);
}

.repos {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.repos a {
  font-family: var(--font-play);
  font-size: 1.9rem;
  line-height: 1.1;
  color: var(--acc-white);
  text-decoration: none;
}

.repos li:nth-child(3n + 1) a:hover,
.repos li:nth-child(3n + 1) a:focus-visible {
  color: var(--acc-red);
}

.repos li:nth-child(3n + 2) a:hover,
.repos li:nth-child(3n + 2) a:focus-visible {
  color: var(--acc-blue);
}

.repos li:nth-child(3n) a:hover,
.repos li:nth-child(3n) a:focus-visible {
  color: var(--acc-green);
}

@media (max-width: 720px) {
  .accsaber {
    justify-content: center;
    padding: 48px 24px;
  }

  .content {
    align-items: center;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stripe,
  .content > * {
    transition: none;
  }

  .stripe.blue,
  .stripe.red,
  .stripe.green {
    transform: rotate(-30deg) translateX(0);
  }

  .content > * {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
