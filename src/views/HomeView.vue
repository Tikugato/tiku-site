<script setup lang="ts">
import { ref } from 'vue'
import { siDiscord, siGithub, siX } from 'simple-icons'
import HeroMark from '../components/HeroMark.vue'
import MarkScene from '../components/MarkScene.vue'

const socials = [
  { name: 'GitHub', url: 'https://github.com/Tikugato', iconPath: siGithub.path },
  { name: 'Discord', copyText: 'tikugato', iconPath: siDiscord.path },
  { name: 'X', url: 'https://x.com/Tikugato', iconPath: siX.path },
]

const mode = ref<'flat' | 'scene'>('flat')
const hasMorphed = ref(false)

function sceneSupported(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  const probe = document.createElement('canvas')
  return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'))
}

function enterScene(): void {
  if (!sceneSupported()) return
  hasMorphed.value = true
  mode.value = 'scene'
}
</script>

<template>
  <main class="home">
    <div class="hero">
      <div class="hero-figure">
        <Transition name="morph">
          <HeroMark
            v-if="mode === 'flat'"
            :socials="socials"
            :skip-intro="hasMorphed"
            class="hero-layer"
            @morph="enterScene"
          />
          <MarkScene v-else class="hero-layer" @exit="mode = 'flat'" />
        </Transition>
      </div>
      <h1 class="name">Tiku</h1>
      <p class="role">Software Developer</p>
    </div>
  </main>
</template>

<style scoped>
.home {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 24px;
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
