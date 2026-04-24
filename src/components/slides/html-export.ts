import type { SlideComponent } from '@/components/slides/types'
import type { SlideCanvas } from '@/components/slides/persistence-types'

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function serializeStyle(component: SlideComponent): string {
  const chunks: string[] = [
    'position:absolute',
    `left:${component.x}px`,
    `top:${component.y}px`,
    `width:${component.width}px`,
  ]

  if (typeof component.height === 'number') chunks.push(`height:${component.height}px`)
  if (component.style.fontSize) chunks.push(`font-size:${component.style.fontSize}px`)
  if (component.style.fontWeight) chunks.push(`font-weight:${component.style.fontWeight}`)
  if (component.style.color) chunks.push(`color:${component.style.color}`)
  if (component.style.backgroundColor) chunks.push(`background-color:${component.style.backgroundColor}`)
  if (component.style.fontStyle) chunks.push(`font-style:${component.style.fontStyle}`)
  if (component.style.lineHeight) chunks.push(`line-height:${component.style.lineHeight}px`)
  if (component.style.textAlign) chunks.push(`text-align:${component.style.textAlign}`)

  return chunks.join(';')
}

function sanitizeContent(content: string): string {
  return content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s(href|src)\s*=\s*"javascript:[^"]*"/gi, '')
    .replace(/\s(href|src)\s*=\s*'javascript:[^']*'/gi, '')
}

function componentToHtml(component: SlideComponent): string {
  const attrs = [
    `data-component-id="${escapeAttribute(component.id)}"`,
    `data-component-type="${escapeAttribute(component.type)}"`,
    `data-source-label="${escapeAttribute(component.sourceLabel || component.type)}"`,
    `style="${escapeAttribute(serializeStyle(component))}"`,
  ]

  const body = sanitizeContent(component.content || '')
  return `<div ${attrs.join(' ')}>${body}</div>`
}

export function convertSlideComponentsToHtml(input: {
  canvas: SlideCanvas
  components: SlideComponent[]
  metadata?: {
    slideId?: string
    revision?: number
    source?: string
  }
}): string {
  const { canvas, components, metadata } = input
  const slideId = metadata?.slideId || 'unsaved-slide'
  const revision = Number.isFinite(metadata?.revision) ? String(metadata?.revision) : '0'
  const source = metadata?.source || 'oliver-app'

  const header = '<!doctype html>\n<html><head><meta charset="utf-8" /><title>Oliver Slide Export</title></head><body>'
  const rootOpen =
    `<div class="slide-canvas" data-slide-root="1" data-oliver-export-version="1" data-oliver-source="${escapeAttribute(source)}" data-oliver-slide-id="${escapeAttribute(slideId)}" data-oliver-revision="${escapeAttribute(revision)}" style="position:relative;width:${canvas.width}px;height:${canvas.height}px;overflow:hidden;">`
  const body = components.map(componentToHtml).join('\n')
  const rootClose = '</div>'
  const footer = '</body></html>'

  return `${header}\n${rootOpen}\n${body}\n${rootClose}\n${footer}`
}
