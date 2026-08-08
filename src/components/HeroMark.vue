<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BANDANA_PATH,
  BAR_LEFT_PATH,
  BAR_RIGHT_PATH,
  BAR_TOP_EDGE,
  BAR_WIDTH,
  MARK_CENTER_X,
  STEM,
  STEM_WIDTH,
} from '../scene/markShape'

export interface SocialLink {
  name: string
  iconPath: string
  url?: string
  copyText?: string
}

const props = defineProps<{
  socials: SocialLink[]
  skipIntro?: boolean
  tailLength?: number
  openProgress?: number
}>()
const emit = defineEmits<{ morph: [] }>()

const stemPath = computed(
  () => `M${MARK_CENTER_X} ${STEM.top} L${MARK_CENTER_X} ${STEM.bottom + (props.tailLength ?? 0)}`,
)

const open = computed(() => Math.min(Math.max(props.openProgress ?? 0, 0), 1))

const barLeftStyle = computed(() => ({ transform: `translateX(${-open.value * 52}px)` }))
const barRightStyle = computed(() => ({ transform: `translateX(${open.value * 52}px)` }))
const socialsStyle = computed(() => ({
  opacity: `${Math.max(1 - open.value * 2.2, 0)}`,
  pointerEvents: open.value > 0.25 ? ('none' as const) : ('auto' as const),
}))

const ICON_SIZE = 13
const ICON_GAP = 24

const copied = ref(false)
let copyTimer = 0

function iconX(index: number): number {
  const offset = index - (props.socials.length - 1) / 2
  return 64 + offset * ICON_GAP - ICON_SIZE / 2
}

async function activate(social: SocialLink, event: Event): Promise<void> {
  if (!social.copyText) return
  event.preventDefault()
  await navigator.clipboard.writeText(social.copyText)
  copied.value = true
  window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copied.value = false
  }, 1600)
}
</script>

<template>
  <svg class="hero-mark" :class="{ settled: props.skipIntro }" viewBox="0 0 128 128">
    <defs>
      <clipPath id="hero-above-bar">
        <rect x="0" y="0" width="128" :height="BAR_TOP_EDGE + 0.5" />
      </clipPath>
    </defs>
    <text v-if="copied" class="copied" x="64" y="12" text-anchor="middle" role="status">copied</text>
    <g clip-path="url(#hero-above-bar)" :style="socialsStyle">
      <a
        v-for="(social, index) in socials"
        :key="social.name"
        class="social"
        :href="social.url"
        :target="social.url ? '_blank' : undefined"
        :rel="social.url ? 'noopener' : undefined"
        :role="social.copyText ? 'button' : undefined"
        :tabindex="social.copyText ? 0 : undefined"
        :aria-label="social.copyText ? `Copy ${social.name} handle` : social.name"
        :style="{ '--index': index }"
        @click="activate(social, $event)"
        @keydown.enter="activate(social, $event)"
        @keydown.space="activate(social, $event)"
      >
        <g :transform="`translate(${iconX(index)} 21)`">
          <g class="social-icon">
            <rect class="social-hit" x="-3" y="-3" width="19" height="19" fill="transparent" />
            <path :d="social.iconPath" transform="scale(0.54)" />
          </g>
        </g>
      </a>
    </g>
    <g class="ribbon">
      <path class="stem" :d="stemPath" :stroke-width="STEM_WIDTH" />
      <path class="bar" :d="BAR_LEFT_PATH" :stroke-width="BAR_WIDTH" :style="barLeftStyle" />
      <path class="bar" :d="BAR_RIGHT_PATH" :stroke-width="BAR_WIDTH" :style="barRightStyle" />
    </g>
    <path
      class="bandana"
      :d="BANDANA_PATH"
      role="button"
      tabindex="0"
      aria-label="See it in 3D"
      @click="emit('morph')"
      @keydown.enter="emit('morph')"
      @keydown.space.prevent="emit('morph')"
    />
  </svg>
</template>

<style scoped>
.hero-mark {
  display: block;
  overflow: visible;
}

.ribbon path {
  fill: none;
  stroke: var(--figure);
  stroke-linejoin: miter;
  stroke-miterlimit: 8;
}

.stem {
  transform-origin: 64px 114px;
  animation: stem-rise 0.55s var(--ease-out) both;
}

.bar {
  stroke-dasharray: 67;
  animation: bar-draw 0.7s cubic-bezier(0.45, 0, 0.55, 1) 0.25s both;
}

.bandana {
  fill: var(--accent);
  transform-origin: 64px 45px;
  cursor: pointer;
  outline: none;
  transition: fill 150ms ease-out;
  animation: bandana-drop 0.35s var(--ease-out) 0.8s both;
}

.bandana:hover,
.bandana:focus-visible {
  fill: #a071c4;
}

.social {
  cursor: pointer;
  animation: social-rise 0.5s var(--ease-out) both;
  animation-delay: calc(1.05s + var(--index) * 0.12s);
  outline: none;
}

.social-icon {
  fill: var(--figure);
  transition: fill 150ms ease-out, transform 150ms ease-out;
}

.social:hover .social-icon,
.social:focus-visible .social-icon {
  fill: var(--accent);
  transform: translateY(-2px);
}

.social:focus-visible .social-hit {
  stroke: var(--accent);
  stroke-width: 1.5;
}

.copied {
  font-family: var(--font-play);
  font-size: 14px;
  fill: var(--accent);
  animation: copied-fade 1.6s ease-out both;
}

@keyframes stem-rise {
  from {
    transform: scaleY(0.02);
  }
  to {
    transform: scaleY(1);
  }
}

@keyframes bar-draw {
  from {
    stroke-dashoffset: 67;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes bandana-drop {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

@keyframes social-rise {
  from {
    transform: translateY(22px);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes copied-fade {
  0% {
    opacity: 0;
    transform: translateY(3px);
  }
  15% {
    opacity: 1;
    transform: translateY(0);
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.settled .stem,
.settled .bar,
.settled .bandana,
.settled .social {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .stem,
  .bar,
  .bandana,
  .social,
  .copied {
    animation: none;
  }

  .social-icon {
    transition: none;
  }
}
</style>
