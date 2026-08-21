import type { Component } from 'vue'

export interface HeroLink {
  name: string
  iconPath: string
  url?: string
  copyText?: string
}

export interface Identity {
  name: string
  role: string
  links: HeroLink[]
  hero: Component
  scene?: Component
  spine: { x: number; bottom: number }
}
