import { siDiscord, siGithub, siX } from 'simple-icons'
import MarkScene from '../components/MarkScene.vue'
import TikuMark from '../components/TikuMark.vue'
import { MARK_CENTER_X, STEM } from '../scene/markShape'
import type { Identity } from './types'

export const identity: Identity = {
  name: 'Tiku',
  role: 'Software Developer',
  links: [
    { name: 'GitHub', url: 'https://github.com/Tikugato', iconPath: siGithub.path },
    { name: 'Discord', copyText: 'tikugato', iconPath: siDiscord.path },
    { name: 'X', url: 'https://x.com/Tikugato', iconPath: siX.path },
  ],
  hero: TikuMark,
  scene: MarkScene,
  spine: { x: MARK_CENTER_X, bottom: STEM.bottom },
}
