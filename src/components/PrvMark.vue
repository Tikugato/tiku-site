<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HeroLink } from '../identity/types'
import {
  BASELINE,
  CAP_TOP_EDGE,
  DIAGONAL_WIDTH,
  LETTER_WIDTH,
  LOCKUP_CENTER_X,
  PART_SHIFT,
  P_BOWL_PATH,
  P_STEM_PATH,
  P_STEM_X,
  R_BOWL_PATH,
  R_LEG_PATH,
  SPINE,
  V_LEFT_PATH,
  V_RIGHT_PATH,
} from '../scene/prvShape'

const props = defineProps<{
  links: HeroLink[]
  skipIntro?: boolean
  tailLength?: number
  openProgress?: number
}>()

const spinePath = computed(
  () => `M${SPINE.x} ${SPINE.top} L${SPINE.x} ${SPINE.bottom + (props.tailLength ?? 0)}`,
)

const open = computed(() => Math.min(Math.max(props.openProgress ?? 0, 0), 1))

const pStyle = computed(() => ({ transform: `translateX(${-open.value * PART_SHIFT}px)` }))
const vStyle = computed(() => ({ transform: `translateX(${open.value * PART_SHIFT}px)` }))
const rArmStyle = computed(() => ({ 'stroke-dashoffset': `${open.value}` }))
const origins = {
  '--spine-origin': `${SPINE.x}px ${BASELINE}px`,
  '--p-origin': `${P_STEM_X}px ${BASELINE}px`,
}

const linksStyle = computed(() => ({
  opacity: `${Math.max(1 - open.value * 2.2, 0)}`,
  pointerEvents: open.value > 0.25 ? ('none' as const) : ('auto' as const),
}))

const ICON_SIZE = 13
const ICON_GAP = 24

const copied = ref(false)
let copyTimer = 0

function iconX(index: number): number {
  const offset = index - (props.links.length - 1) / 2
  return LOCKUP_CENTER_X + offset * ICON_GAP - ICON_SIZE / 2
}

async function activate(link: HeroLink, event: Event): Promise<void> {
  if (!link.copyText) return
  event.preventDefault()
  await navigator.clipboard.writeText(link.copyText)
  copied.value = true
  window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copied.value = false
  }, 1600)
}
</script>

<template>
  <svg class="hero-mark" :class="{ settled: props.skipIntro }" :style="origins" viewBox="0 0 128 128">
    <defs>
      <clipPath id="hero-above-caps">
        <rect x="0" y="0" width="128" :height="CAP_TOP_EDGE" />
      </clipPath>
      <clipPath id="prv-cap-band">
        <rect x="-300" :y="CAP_TOP_EDGE" width="800" :height="BASELINE - CAP_TOP_EDGE" />
      </clipPath>
    </defs>
    <text v-if="copied" class="copied" :x="LOCKUP_CENTER_X" y="14" text-anchor="middle" role="status">
      copied
    </text>
    <g clip-path="url(#hero-above-caps)" :style="linksStyle">
      <a
        v-for="(link, index) in links"
        :key="link.name"
        class="link"
        :href="link.url"
        :target="link.url ? '_blank' : undefined"
        :rel="link.url ? 'noopener' : undefined"
        :role="link.copyText ? 'button' : undefined"
        :tabindex="link.copyText ? 0 : undefined"
        :aria-label="link.copyText ? `Copy ${link.name} handle` : link.name"
        :style="{ '--index': index }"
        @click="activate(link, $event)"
        @keydown.enter="activate(link, $event)"
        @keydown.space="activate(link, $event)"
      >
        <g :transform="`translate(${iconX(index)} 28)`">
          <g class="link-icon">
            <rect class="link-hit" x="-3" y="-3" width="19" height="19" fill="transparent" />
            <path :d="link.iconPath" transform="scale(0.54)" />
          </g>
        </g>
      </a>
    </g>
    <g class="letters" :stroke-width="LETTER_WIDTH">
      <path class="spine" :d="spinePath" />
      <g class="letter-p" :style="pStyle">
        <path class="rise" :d="P_STEM_PATH" />
        <path class="draw" pathLength="1" :d="P_BOWL_PATH" />
      </g>
      <path class="draw" pathLength="1" :d="R_BOWL_PATH" :style="rArmStyle" />
      <g clip-path="url(#prv-cap-band)">
        <path
          class="draw"
          pathLength="1"
          :d="R_LEG_PATH"
          :stroke-width="DIAGONAL_WIDTH"
          :style="rArmStyle"
        />
        <path
          v-for="leg in [V_LEFT_PATH, V_RIGHT_PATH]"
          :key="leg"
          class="draw letter-v"
          pathLength="1"
          :d="leg"
          :stroke-width="DIAGONAL_WIDTH"
          :style="vStyle"
        />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.hero-mark {
  display: block;
  overflow: visible;
}

.letters path {
  fill: none;
  stroke: var(--figure);
  stroke-linejoin: miter;
  stroke-miterlimit: 8;
}

.spine {
  transform-origin: var(--spine-origin);
  animation: spine-rise 0.55s var(--ease-out) backwards;
}

.rise {
  transform-origin: var(--p-origin);
  animation: spine-rise 0.55s var(--ease-out) 0.12s backwards;
}

.draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  animation: stroke-draw 0.6s cubic-bezier(0.45, 0, 0.55, 1) 0.3s backwards;
}

.letter-v {
  animation-delay: 0.42s;
}

.link {
  cursor: pointer;
  animation: link-rise 0.5s var(--ease-out) backwards;
  animation-delay: calc(1.05s + var(--index) * 0.12s);
  outline: none;
}

.link-icon {
  fill: var(--figure);
  transition: fill 150ms ease-out, transform 150ms ease-out;
}

.link:hover .link-icon,
.link:focus-visible .link-icon {
  fill: var(--accent);
  transform: translateY(-2px);
}

.link:focus-visible .link-hit {
  stroke: var(--accent);
  stroke-width: 1.5;
}

.copied {
  font-family: var(--font-play);
  font-size: 14px;
  fill: var(--accent);
  animation: copied-fade 1.6s ease-out both;
}

@keyframes spine-rise {
  from {
    transform: scaleY(0.02);
  }
  to {
    transform: scaleY(1);
  }
}

@keyframes stroke-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes link-rise {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
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

.settled .spine,
.settled .rise,
.settled .draw,
.settled .link {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .spine,
  .rise,
  .draw,
  .letter-v,
  .link,
  .copied {
    animation: none;
  }

  .link-icon {
    transition: none;
  }
}
</style>
