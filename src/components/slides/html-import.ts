import type { SlideComponent, SlideComponentStyle, SlideComponentType, SlideImportResult } from '@/components/slides/types'

const DEFAULT_CANVAS_WIDTH = 1920
const DEFAULT_CANVAS_HEIGHT = 1080
const CANVAS_TARGET_ASPECT_RATIO = DEFAULT_CANVAS_WIDTH / DEFAULT_CANVAS_HEIGHT
const MIN_FLOW_NODE_SIZE = 12
const IMPORT_ROOT_MARKER_ATTR = 'data-import-root-id'
const IMPORT_ROOT_MARKER_VALUE = 'import-root'
const FLOW_TEXT_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'li',
  'blockquote',
  'figcaption',
  'button',
  'label',
  'a',
  'dt',
  'dd',
])
const FLOW_MEDIA_TAGS = new Set(['img', 'picture', 'svg', 'canvas', 'video'])
const IMPORT_STYLE_PROPERTIES = [
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'font-style',
  'font-family',
  'line-height',
  'text-align',
  'letter-spacing',
  'text-transform',
  'display',
  'align-items',
  'justify-content',
  'gap',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-radius',
] as const

interface ParsedLength {
  raw: string
  value: number
  unit: string
}

interface MeasuredNodeRect {
  x?: number
  y?: number
  width?: number
  height?: number
}

interface RenderSnapshot {
  root: HTMLElement | null
  nodesById: Map<string, HTMLElement>
  dispose: () => void
}

function makeSafeResolvedUrl(rawUrl: string, baseUrl: string): string | null {
  try {
    return new URL(rawUrl, baseUrl).toString()
  } catch {
    return null
  }
}

function parseStylesheetHref(styleSheet: HTMLLinkElement, baseUrl: string): string | null {
  const href = styleSheet.getAttribute('href')
  if (!href) return null
  const resolved = makeSafeResolvedUrl(href, baseUrl)
  if (!resolved) return null
  if (resolved.startsWith('data:')) return null
  return resolved
}

async function fetchWithTimeout(url: string, timeoutMs = 1500): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      cache: 'no-cache',
    })

    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function inlineExternalStylesheets(doc: Document, warnings: string[]): Promise<string> {
  const stylesheets = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"][href]'))
  if (stylesheets.length === 0) return ''

  warnings.push(
    'Detected ' +
    stylesheets.length +
    ' linked stylesheet reference' +
    (stylesheets.length === 1 ? '' : 's') +
    '; attempting to inline linked CSS for fidelity.',
  )

  const baseUrl = doc.baseURI || window.location.href
  const fetched = await Promise.allSettled(
    stylesheets.map((stylesheet) => {
      const href = parseStylesheetHref(stylesheet, baseUrl)
      if (!href) return Promise.resolve(null)
      return fetchWithTimeout(href).then((cssText) => ({ href, cssText }))
    }),
  )

  const inlinedStyles: string[] = []
  fetched.forEach((entry) => {
    if (entry.status !== 'fulfilled' || !entry.value?.cssText) return
    inlinedStyles.push(entry.value.cssText)
  })

  const unresolvedCount = stylesheets.length - inlinedStyles.length
  if (unresolvedCount > 0) {
    warnings.push(
      'Could not inline ' +
      unresolvedCount +
      ' linked stylesheet' +
      (unresolvedCount === 1 ? '' : 's') +
      '; remaining fallback styles may differ from source.',
    )
  }

  return inlinedStyles.join('\n')
}

function parseInlineStyle(styleValue: string): Record<string, string> {
  const styleMap: Record<string, string> = {}
  for (const segment of styleValue.split(';')) {
    const idx = segment.indexOf(':')
    if (idx <= 0) continue
    const key = segment.slice(0, idx).trim().toLowerCase()
    const value = segment.slice(idx + 1).trim()
    if (key) styleMap[key] = value
  }
  return styleMap
}

function parseLength(value: string | null | undefined): ParsedLength | undefined {
  if (!value) return undefined
  const raw = value.trim().toLowerCase()
  if (!raw) return undefined

  const match = raw.match(/^(-?\d*\.?\d+)([a-z%]*)$/)
  if (!match) return undefined

  const parsed = Number.parseFloat(match[1])
  if (!Number.isFinite(parsed)) return undefined

  return {
    raw,
    value: parsed,
    unit: match[2] || '',
  }
}

function isPxLike(length: ParsedLength): boolean {
  return length.value === 0 || length.unit === '' || length.unit === 'px'
}

function parsePositivePx(rawValue: string | null | undefined): number | undefined {
  const parsed = parseLength(rawValue)
  if (!parsed) return undefined
  if (!isPxLike(parsed)) return undefined
  if (parsed.value <= 0) return undefined
  return parsed.value
}

function estimateNodeAreaFromDeclaredSize(node: HTMLElement): number {
  const styleMap = parseInlineStyle(node.getAttribute('style') || '')
  const width = parsePositivePx(styleMap.width ?? node.getAttribute('width'))
  const height = parsePositivePx(styleMap.height ?? node.getAttribute('height'))
  if (!width || !height) return 0
  return width * height
}

function sanitizeNodeInPlace(root: HTMLElement): void {
  root.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(el => el.remove())

  const allNodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
  for (const element of allNodes) {
    for (const attr of Array.from(element.attributes)) {
      const attrName = attr.name.toLowerCase()
      const attrValue = attr.value.trim().toLowerCase()
      if (attrName.startsWith('on')) {
        element.removeAttribute(attr.name)
        continue
      }
      if ((attrName === 'href' || attrName === 'src') && attrValue.startsWith('javascript:')) {
        element.removeAttribute(attr.name)
      }
    }
  }
}

function readComputedStyleSafe(node: HTMLElement): CSSStyleDeclaration | null {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return null
  try {
    return window.getComputedStyle(node)
  } catch {
    return null
  }
}

function normalizeColor(value: string | undefined): string | undefined {
  if (!value) return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  if (normalized === 'transparent') return undefined
  if (normalized === 'rgba(0, 0, 0, 0)' || normalized === 'rgba(0,0,0,0)') return undefined
  return normalized
}

function hasRenderedBorder(style: CSSStyleDeclaration): boolean {
  const widths = [
    style.borderTopWidth,
    style.borderRightWidth,
    style.borderBottomWidth,
    style.borderLeftWidth,
  ]
  const styles = [
    style.borderTopStyle,
    style.borderRightStyle,
    style.borderBottomStyle,
    style.borderLeftStyle,
  ]

  for (let index = 0; index < widths.length; index += 1) {
    const width = parseLength(widths[index])
    const hasWidth = !!width && isPxLike(width) && width.value > 0
    const borderStyle = (styles[index] || '').trim().toLowerCase()
    if (hasWidth && borderStyle && borderStyle !== 'none' && borderStyle !== 'hidden') return true
  }

  return false
}

function serializeInlineImportStyle(computedStyle: CSSStyleDeclaration | null): string {
  if (!computedStyle) return ''
  const entries: string[] = []
  for (const property of IMPORT_STYLE_PROPERTIES) {
    const value = computedStyle.getPropertyValue(property).trim()
    if (!value) continue
    if (property === 'background-color' && !normalizeColor(value)) continue
    if (property === 'border-top' || property === 'border-right' || property === 'border-bottom' || property === 'border-left') {
      if (value === '0px none rgb(0, 0, 0)' || value === 'none') continue
    }
    entries.push(`${property}: ${value}`)
  }
  return entries.join('; ')
}

function buildSanitizedContentNode(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement
  const sourceNodes = [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))]
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]
  const count = Math.min(sourceNodes.length, cloneNodes.length)

  for (let index = 0; index < count; index += 1) {
    const inlineStyle = serializeInlineImportStyle(readComputedStyleSafe(sourceNodes[index]))
    if (inlineStyle) cloneNodes[index].setAttribute('style', inlineStyle)
  }

  sanitizeNodeInPlace(clone)
  return clone
}

function inferType(node: HTMLElement): SlideComponentType {
  const className = (node.className || '').toString().toLowerCase()
  const text = (node.textContent || '').trim().toLowerCase()
  const tag = node.tagName.toLowerCase()
  const alt = (node.getAttribute('alt') || '').toLowerCase()

  if (tag === 'img' && (className.includes('logo') || alt.includes('logo'))) return 'logo'
  if (tag === 'h1' || tag === 'h2' || className.includes('heading') || className.includes('title')) return 'heading'
  if (tag === 'h3' || tag === 'h4' || className.includes('subheading') || className.includes('subtitle')) return 'subheading'
  if (className.includes('tagline') || className.includes('tag-line')) return 'tag-line'
  if (className.includes('stat') || className.includes('metric')) return 'stat'
  if (className.includes('card')) return 'card'
  if (className.includes('row')) return 'row'
  if (className.includes('panel') || className.includes('container')) return 'panel'
  if (text.length <= 32 && /\d/.test(text) && className.includes('kpi')) return 'stat'
  return 'text'
}

function parseStylePx(
  styleMap: Record<string, string>,
  key: string,
  nodeLabel: string,
  warnings: string[],
): number | undefined {
  const raw = styleMap[key]
  if (raw === undefined) return undefined

  const parsed = parseLength(raw)
  if (!parsed) {
    warnings.push('Node "' + nodeLabel + '" has non-numeric ' + key + ' value "' + raw + '"; ignored.')
    return undefined
  }

  if (!isPxLike(parsed)) {
    warnings.push('Node "' + nodeLabel + '" uses unsupported ' + key + ' unit "' + parsed.unit + '"; ignored.')
    return undefined
  }

  return parsed.value
}

function parseAttrPx(
  rawValue: string | null,
  attrName: string,
  nodeLabel: string,
  warnings: string[],
): number | undefined {
  const parsed = parseLength(rawValue)
  if (!parsed) return undefined

  if (!isPxLike(parsed)) {
    warnings.push('Node "' + nodeLabel + '" uses unsupported ' + attrName + ' unit "' + parsed.unit + '"; ignored.')
    return undefined
  }

  return parsed.value
}

function parseCanvasPx(
  rawValue: string | undefined,
  axisLabel: 'width' | 'height',
  warnings: string[],
): number | undefined {
  const parsed = parseLength(rawValue)
  if (!parsed) return undefined

  if (!isPxLike(parsed)) {
    warnings.push('Slide root uses unsupported canvas ' + axisLabel + ' unit "' + parsed.unit + '"; defaulted to ' + (axisLabel === 'width' ? DEFAULT_CANVAS_WIDTH : DEFAULT_CANVAS_HEIGHT) + '.')
    return undefined
  }

  if (parsed.value <= 0) {
    warnings.push('Slide root has non-positive canvas ' + axisLabel + '; defaulted to ' + (axisLabel === 'width' ? DEFAULT_CANVAS_WIDTH : DEFAULT_CANVAS_HEIGHT) + '.')
    return undefined
  }

  return parsed.value
}

function parseTransformOffsets(
  transformRaw: string | undefined,
  nodeLabel: string,
  warnings: string[],
): { x: number; y: number } {
  if (!transformRaw || transformRaw === 'none') return { x: 0, y: 0 }

  const normalized = transformRaw.trim().toLowerCase()

  const unsupportedTransformTokens = ['matrix(', 'scale(', 'rotate(', 'skew(', 'perspective(']
  if (unsupportedTransformTokens.some(token => normalized.includes(token))) {
    warnings.push('Node "' + nodeLabel + '" uses unsupported transform "' + transformRaw + '"; ignored.')
    return { x: 0, y: 0 }
  }

  const translateMatch = normalized.match(/^translate\(([^,]+),\s*([^)]+)\)$/)
  if (translateMatch) {
    const xLength = parseLength(translateMatch[1])
    const yLength = parseLength(translateMatch[2])
    if (!xLength || !yLength || !isPxLike(xLength) || !isPxLike(yLength)) {
      warnings.push('Node "' + nodeLabel + '" uses unsupported translate values in transform "' + transformRaw + '"; ignored.')
      return { x: 0, y: 0 }
    }
    return { x: xLength.value, y: yLength.value }
  }

  const translateXMatch = normalized.match(/translatex\(([^)]+)\)/)
  const translateYMatch = normalized.match(/translatey\(([^)]+)\)/)
  if (translateXMatch || translateYMatch) {
    const xLength = parseLength(translateXMatch?.[1])
    const yLength = parseLength(translateYMatch?.[1])

    if ((xLength && !isPxLike(xLength)) || (yLength && !isPxLike(yLength))) {
      warnings.push('Node "' + nodeLabel + '" uses unsupported translate unit in transform "' + transformRaw + '"; ignored.')
      return { x: 0, y: 0 }
    }

    return {
      x: xLength?.value ?? 0,
      y: yLength?.value ?? 0,
    }
  }

  warnings.push('Node "' + nodeLabel + '" uses unsupported transform "' + transformRaw + '"; ignored.')
  return { x: 0, y: 0 }
}

function parseFontWeight(value: string | undefined): number | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized === 'normal') return 400
  if (normalized === 'bold') return 700
  const parsed = Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeTextAlign(value: string | undefined): SlideComponentStyle['textAlign'] | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'start') return 'left'
  if (normalized === 'end') return 'right'
  if (normalized === 'left' || normalized === 'center' || normalized === 'right' || normalized === 'justify') {
    return normalized
  }
  return undefined
}

function extractStyle(
  styleMap: Record<string, string>,
  computedStyle: CSSStyleDeclaration | null,
): SlideComponentStyle {
  const fontSizeLength = parseLength(computedStyle?.fontSize || styleMap['font-size'])
  const lineHeightLength = parseLength(computedStyle?.lineHeight || styleMap['line-height'])
  const fontWeight = parseFontWeight(computedStyle?.fontWeight || styleMap['font-weight'])
  const color = normalizeColor(computedStyle?.color || styleMap.color)
  const backgroundColor = normalizeColor(computedStyle?.backgroundColor || styleMap['background-color'])
  const fontStyleRaw = (computedStyle?.fontStyle || styleMap['font-style'] || '').trim().toLowerCase()
  const fontStyle = fontStyleRaw === 'italic' ? 'italic' : undefined
  const textAlign = normalizeTextAlign(computedStyle?.textAlign || styleMap['text-align'])
  const fontFamilyRaw = (computedStyle?.fontFamily || styleMap['font-family'] || '').trim()
  const fontFamily = fontFamilyRaw || undefined

  return {
    fontSize: fontSizeLength && isPxLike(fontSizeLength) ? fontSizeLength.value : undefined,
    fontWeight,
    fontFamily,
    color,
    backgroundColor,
    fontStyle,
    lineHeight: lineHeightLength && isPxLike(lineHeightLength) ? lineHeightLength.value : undefined,
    textAlign,
  }
}

function getCanvasRoot(doc: Document): HTMLElement | null {
  if (!doc.body) return null

  const prioritizedSelectors = ['.page', '[data-slide-root]', '.slide-canvas', '.slide']
  for (const selector of prioritizedSelectors) {
    const matches = Array.from(doc.querySelectorAll<HTMLElement>(selector))
    if (matches.length === 0) continue

    const best = matches
      .map((candidate) => ({
        candidate,
        score: estimateNodeAreaFromDeclaredSize(candidate),
      }))
      .sort((a, b) => b.score - a.score)[0]

    if (best?.candidate) return best.candidate
  }

  const scoredCandidates = Array.from(doc.body.querySelectorAll<HTMLElement>('div,section,article,main'))
    .map((candidate) => {
      const styleMap = parseInlineStyle(candidate.getAttribute('style') || '')
      const width = parsePositivePx(styleMap.width ?? candidate.getAttribute('width'))
      const height = parsePositivePx(styleMap.height ?? candidate.getAttribute('height'))
      if (!width || !height) return { candidate, score: 0 }

      const ratio = width / height
      const ratioDelta = Math.abs(ratio - CANVAS_TARGET_ASPECT_RATIO)
      const ratioScore = Math.max(0, 1 - Math.min(1, ratioDelta / 0.9))
      const areaScore = width * height
      const className = (candidate.className || '').toString().toLowerCase()
      const semanticBoost = /slide|deck|canvas|presentation|frame|artboard/.test(className) ? 1_000_000 : 0
      return {
        candidate,
        score: areaScore * ratioScore + semanticBoost,
      }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scoredCandidates.length > 0) return scoredCandidates[0].candidate

  return doc.body
}

function shouldImportNode(node: HTMLElement, computedStyle: CSSStyleDeclaration | null): boolean {
  const style = parseInlineStyle(node.getAttribute('style') || '')
  const computedPosition = (computedStyle?.position || '').trim().toLowerCase()
  const computedLeft = (computedStyle?.left || '').trim().toLowerCase()
  const computedTop = (computedStyle?.top || '').trim().toLowerCase()
  const hasComputedPlacement = (computedLeft && computedLeft !== 'auto') || (computedTop && computedTop !== 'auto')
  const hasPositionInfo =
    style.position === 'absolute' ||
    style.position === 'fixed' ||
    computedPosition === 'absolute' ||
    computedPosition === 'fixed' ||
    style.left !== undefined ||
    style.top !== undefined ||
    hasComputedPlacement

  if (!hasPositionInfo) return false
  if (node.tagName.toLowerCase() === 'img') return true
  return !!node.textContent?.trim()
}

function getNodeLabel(node: HTMLElement): string {
  const id = node.getAttribute('id')
  if (id) return '#' + id

  const classes = (node.className || '').toString().trim()
  if (classes) {
    const firstClass = classes.split(/\s+/).filter(Boolean)[0]
    if (firstClass) return '.' + firstClass
  }

  return node.tagName.toLowerCase()
}

function scaleValue(value: number, scale: number): number {
  return Number((value * scale).toFixed(3))
}

function scaleTypographyStyle(
  style: SlideComponentStyle,
  scaleX: number,
  scaleY: number,
  options?: {
    minScale?: number
  },
): SlideComponentStyle {
  let typographyScale = Number(((scaleX + scaleY) / 2).toFixed(6))
  if (typeof options?.minScale === 'number') {
    typographyScale = Math.max(options.minScale, typographyScale)
  }
  if (!Number.isFinite(typographyScale) || typographyScale === 1) return style

  return {
    ...style,
    fontSize: typeof style.fontSize === 'number' ? scaleValue(style.fontSize, typographyScale) : style.fontSize,
    lineHeight: typeof style.lineHeight === 'number' ? scaleValue(style.lineHeight, typographyScale) : style.lineHeight,
  }
}

function measureNodeRect(node: HTMLElement, root: HTMLElement): MeasuredNodeRect {
  if (typeof node.getBoundingClientRect !== 'function' || typeof root.getBoundingClientRect !== 'function') {
    return {}
  }

  const rect = node.getBoundingClientRect()
  const rootRect = root.getBoundingClientRect()
  if (!Number.isFinite(rect.left) || !Number.isFinite(rootRect.left)) return {}

  return {
    x: Math.max(0, rect.left - rootRect.left),
    y: Math.max(0, rect.top - rootRect.top),
    width: Number.isFinite(rect.width) && rect.width > 0 ? rect.width : undefined,
    height: Number.isFinite(rect.height) && rect.height > 0 ? rect.height : undefined,
  }
}

function measureContentBounds(
  nodes: HTMLElement[],
  snapshot: RenderSnapshot,
  root: HTMLElement,
): { width?: number; height?: number } {
  let maxRight = 0
  let maxBottom = 0

  for (const node of nodes) {
    const nodeId = node.getAttribute('data-import-node-id') || ''
    const renderNode = snapshot.nodesById.get(nodeId) || node
    const renderRoot = snapshot.root || root
    const measured = measureNodeRect(renderNode, renderRoot)
    if (measured.width === undefined || measured.height === undefined) continue
    const x = measured.x || 0
    const y = measured.y || 0
    maxRight = Math.max(maxRight, x + measured.width)
    maxBottom = Math.max(maxBottom, y + measured.height)
  }

  return {
    width: maxRight > 0 ? maxRight : undefined,
    height: maxBottom > 0 ? maxBottom : undefined,
  }
}

function buildRenderSnapshot(doc: Document, root: HTMLElement, additionalCss: string): RenderSnapshot {
  if (typeof document === 'undefined' || !document.body) {
    return {
      root: null,
      nodesById: new Map(),
      dispose: () => {},
    }
  }

  const sandbox = document.createElement('div')
  sandbox.style.position = 'fixed'
  sandbox.style.left = '-100000px'
  sandbox.style.top = '-100000px'
  sandbox.style.width = '1920px'
  sandbox.style.minHeight = '1080px'
  sandbox.style.opacity = '0'
  sandbox.style.pointerEvents = 'none'
  sandbox.style.zIndex = '-1'
  sandbox.style.overflow = 'hidden'

  const styleChunks = Array.from(doc.querySelectorAll('style'))
    .map((styleEl) => styleEl.textContent || '')
    .filter(Boolean)
  if (additionalCss) {
    styleChunks.push(additionalCss)
  }
  if (styleChunks.length > 0) {
    const styleEl = document.createElement('style')
    styleEl.textContent = styleChunks.join('\n')
    sandbox.appendChild(styleEl)
  }

  let rootClone: HTMLElement | null = null
  const sourceBody = doc.body
  if (sourceBody) {
    const bodyClone = sourceBody.cloneNode(true) as HTMLElement
    const sourceHtml = doc.documentElement
    if (sourceHtml) {
      const htmlClone = document.createElement('html')
      for (const attribute of Array.from(sourceHtml.attributes)) {
        htmlClone.setAttribute(attribute.name, attribute.value)
      }
      htmlClone.appendChild(bodyClone)
      sandbox.appendChild(htmlClone)
    } else {
      sandbox.appendChild(bodyClone)
    }

    if (bodyClone.getAttribute(IMPORT_ROOT_MARKER_ATTR) === IMPORT_ROOT_MARKER_VALUE) {
      rootClone = bodyClone
    } else {
      rootClone = bodyClone.querySelector<HTMLElement>(`[${IMPORT_ROOT_MARKER_ATTR}="${IMPORT_ROOT_MARKER_VALUE}"]`)
    }
  }

  if (!rootClone) {
    rootClone = root.cloneNode(true) as HTMLElement
    sandbox.appendChild(rootClone)
  }
  document.body.appendChild(sandbox)

  const nodesById = new Map<string, HTMLElement>()
  for (const node of Array.from(sandbox.querySelectorAll<HTMLElement>('[data-import-node-id]'))) {
    const id = node.getAttribute('data-import-node-id')
    if (!id) continue
    nodesById.set(id, node)
  }

  return {
    root: rootClone,
    nodesById,
    dispose: () => {
      sandbox.remove()
    },
  }
}

function hasOwnTextNode(node: HTMLElement): boolean {
  return Array.from(node.childNodes).some((child) => child.nodeType === 3 && Boolean(child.textContent?.trim()))
}

function shouldImportFlowNode(
  node: HTMLElement,
  computedStyle: CSSStyleDeclaration | null,
  measuredRect: MeasuredNodeRect,
): boolean {
  if (!computedStyle) return false

  const display = (computedStyle.display || '').trim().toLowerCase()
  const visibility = (computedStyle.visibility || '').trim().toLowerCase()
  const opacity = Number.parseFloat(computedStyle.opacity || '1')
  if (display === 'none' || visibility === 'hidden') return false
  if (Number.isFinite(opacity) && opacity <= 0.01) return false

  const width = measuredRect.width || 0
  const height = measuredRect.height || 0
  if (width < MIN_FLOW_NODE_SIZE || height < MIN_FLOW_NODE_SIZE) return false

  const tag = node.tagName.toLowerCase()
  if (FLOW_MEDIA_TAGS.has(tag)) return true

  const text = (node.textContent || '').trim()
  const ownText = hasOwnTextNode(node)
  const hasBackground = Boolean(normalizeColor(computedStyle.backgroundColor))
  const hasBorder = hasRenderedBorder(computedStyle)

  if (hasBackground || hasBorder) return true
  if (FLOW_TEXT_TAGS.has(tag) && text.length > 0) return true
  if (ownText && display !== 'inline') return true

  return false
}

export async function convertHtmlToSlideComponents(html: string): Promise<SlideImportResult> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const root = getCanvasRoot(doc)

  if (!root) {
    return {
      canvas: { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT },
      components: [],
      warnings: ['Could not detect a slide root element.'],
    }
  }

  root.setAttribute(IMPORT_ROOT_MARKER_ATTR, IMPORT_ROOT_MARKER_VALUE)
  const allNodes = Array.from(root.querySelectorAll<HTMLElement>('*'))
  for (let index = 0; index < allNodes.length; index += 1) {
    allNodes[index].setAttribute('data-import-node-id', `import-node-${index + 1}`)
  }

  const warnings: string[] = []
  const inlinedStyles = await inlineExternalStylesheets(doc, warnings)
  const styleSources = Array.from(doc.querySelectorAll('style'))
    .map((styleNode) => styleNode.textContent || '')
    .filter(Boolean)
    .join('\n')
    .toLowerCase()
  if (styleSources.includes('::before') || styleSources.includes('::after')) {
    warnings.push('Detected pseudo-elements (::before/::after); pseudo-element layers are not extracted and may require manual recreation.')
  }
  if (styleSources.includes('@keyframes') || /\banimation\s*:/.test(styleSources)) {
    warnings.push('Detected CSS animations; animation effects are not imported and static styles are used.')
  }
  if (root.querySelector('canvas')) {
    warnings.push('Detected canvas elements; canvas pixel content is not extracted into editable layers.')
  }
  if (root.querySelector('video')) {
    warnings.push('Detected video elements; video playback layers are not imported as editable slide components.')
  }
  const renderSnapshot = buildRenderSnapshot(doc, root, inlinedStyles)

  try {
    const rootStyle = parseInlineStyle(root.getAttribute('style') || '')
    const measuredRootRect = renderSnapshot.root ? measureNodeRect(renderSnapshot.root, renderSnapshot.root) : {}
    const explicitCanvasWidth = parseCanvasPx(rootStyle.width ?? root.getAttribute('width') ?? undefined, 'width', warnings)
    const explicitCanvasHeight = parseCanvasPx(rootStyle.height ?? root.getAttribute('height') ?? undefined, 'height', warnings)

    const absoluteNodes = allNodes.filter((node) => {
      const nodeId = node.getAttribute('data-import-node-id') || ''
      const renderNode = renderSnapshot.nodesById.get(nodeId) || node
      return shouldImportNode(node, readComputedStyleSafe(renderNode))
    })
    const fallbackNodes = Array.from(root.children).filter((node): node is HTMLElement => node instanceof HTMLElement)
    const flowNodes = allNodes.filter((node) => {
      const nodeId = node.getAttribute('data-import-node-id') || ''
      const renderNode = renderSnapshot.nodesById.get(nodeId) || node
      const renderRoot = renderSnapshot.root || root
      const measuredRect = measureNodeRect(renderNode, renderRoot)
      return shouldImportFlowNode(node, readComputedStyleSafe(renderNode), measuredRect)
    })
    const nodes = absoluteNodes.length > 0
      ? absoluteNodes
      : flowNodes.length > 0
        ? flowNodes
        : fallbackNodes
    const importMode = absoluteNodes.length > 0
      ? 'absolute'
      : flowNodes.length > 0
        ? 'flow'
        : 'fallback'
    const contentBounds = measureContentBounds(nodes, renderSnapshot, root)
    let sourceCanvasWidth = explicitCanvasWidth
      ?? measuredRootRect.width
      ?? DEFAULT_CANVAS_WIDTH
    let sourceCanvasHeight = explicitCanvasHeight
      ?? measuredRootRect.height
      ?? DEFAULT_CANVAS_HEIGHT

    if (explicitCanvasWidth === undefined && contentBounds.width && sourceCanvasWidth > contentBounds.width * 1.75) {
      sourceCanvasWidth = Math.max(contentBounds.width, DEFAULT_CANVAS_WIDTH)
      warnings.push(
        'Detected oversized root width during import; normalized canvas width using layer bounds to avoid compressed output.',
      )
    }
    if (explicitCanvasHeight === undefined && contentBounds.height && sourceCanvasHeight > contentBounds.height * 1.75) {
      sourceCanvasHeight = Math.max(contentBounds.height, DEFAULT_CANVAS_HEIGHT)
      warnings.push(
        'Detected oversized root height during import; normalized canvas height using layer bounds to avoid compressed output.',
      )
    }

    const scaleX = DEFAULT_CANVAS_WIDTH / sourceCanvasWidth
    const scaleY = DEFAULT_CANVAS_HEIGHT / sourceCanvasHeight
    const shouldClampTypographyScale = explicitCanvasWidth === undefined || explicitCanvasHeight === undefined

    if (absoluteNodes.length === 0) {
      if (flowNodes.length > 0) {
        warnings.push('No absolutely positioned elements found; imported flow-layout nodes using computed bounds.')
      } else {
        warnings.push('No absolutely positioned elements found; imported top-level nodes as fallback.')
      }
    }
    if (sourceCanvasWidth !== DEFAULT_CANVAS_WIDTH || sourceCanvasHeight !== DEFAULT_CANVAS_HEIGHT) {
      warnings.push(
        'Normalized imported canvas from ' +
        sourceCanvasWidth +
        'x' +
        sourceCanvasHeight +
        ' to ' +
        DEFAULT_CANVAS_WIDTH +
        'x' +
        DEFAULT_CANVAS_HEIGHT +
        '.',
      )
    }
    if (importMode === 'fallback' && nodes.length > 0) {
      warnings.push(`Imported ${nodes.length} fallback node${nodes.length === 1 ? '' : 's'} as locked layers for visual fidelity.`)
    }

    const components: SlideComponent[] = nodes.map((node, index) => {
      const styleMap = parseInlineStyle(node.getAttribute('style') || '')
      const nodeLabel = getNodeLabel(node)
      const nodeId = node.getAttribute('data-import-node-id') || ''
      const renderNode = renderSnapshot.nodesById.get(nodeId) || node
      const renderRoot = renderSnapshot.root || root
      const computedStyle = readComputedStyleSafe(renderNode)
      const measured = measureNodeRect(renderNode, renderRoot)
      const sanitizedNode = buildSanitizedContentNode(renderNode)
      const content = sanitizedNode.innerHTML.trim() || sanitizedNode.outerHTML.trim()

      const transformOffsets = parseTransformOffsets(styleMap.transform, nodeLabel, warnings)
      const baseX = measured.x
        ?? parseStylePx(styleMap, 'left', nodeLabel, warnings)
        ?? 0
      const baseY = measured.y
        ?? parseStylePx(styleMap, 'top', nodeLabel, warnings)
        ?? 0
      const baseWidth = measured.width
        ?? parseStylePx(styleMap, 'width', nodeLabel, warnings)
        ?? parseAttrPx(node.getAttribute('width'), 'width', nodeLabel, warnings)
        ?? 320
      const baseHeight = measured.height
        ?? parseStylePx(styleMap, 'height', nodeLabel, warnings)
        ?? parseAttrPx(node.getAttribute('height'), 'height', nodeLabel, warnings)

      const extractedStyle = extractStyle(styleMap, computedStyle)
      const fallbackLocked = importMode === 'fallback'
      return {
        id: 'import-' + String(index + 1).padStart(3, '0'),
        type: inferType(node),
        sourceLabel: fallbackLocked ? `${nodeLabel} (fallback)` : nodeLabel,
        x: scaleValue(baseX + transformOffsets.x, scaleX),
        y: scaleValue(baseY + transformOffsets.y, scaleY),
        width: scaleValue(baseWidth, scaleX),
        height: baseHeight === undefined ? undefined : scaleValue(baseHeight, scaleY),
        content,
        style: scaleTypographyStyle(
          extractedStyle,
          scaleX,
          scaleY,
          shouldClampTypographyScale
            ? { minScale: 0.75 }
            : undefined,
        ),
        locked: fallbackLocked,
        visible: true,
      }
    })

    return {
      canvas: { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT },
      components,
      warnings: Array.from(new Set(warnings)),
    }
  } finally {
    renderSnapshot.dispose()
  }
}
