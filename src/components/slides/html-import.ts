import type { SlideComponent, SlideComponentStyle, SlideComponentType, SlideImportResult } from '@/components/slides/types'

const DEFAULT_CANVAS_WIDTH = 1920
const DEFAULT_CANVAS_HEIGHT = 1080

interface ParsedLength {
  raw: string
  value: number
  unit: string
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

function sanitizeNode(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement
  clone.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(el => el.remove())

  const allNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]
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

function extractStyle(styleMap: Record<string, string>): SlideComponentStyle {
  const fontSizeLength = parseLength(styleMap['font-size'])
  const lineHeightLength = parseLength(styleMap['line-height'])
  const fontWeightRaw = styleMap['font-weight']
  const fontWeight = fontWeightRaw ? Number.parseInt(fontWeightRaw, 10) : undefined
  const color = styleMap.color
  const backgroundColor = styleMap['background-color']
  const fontStyleRaw = styleMap['font-style']
  const fontStyle = fontStyleRaw === 'italic' ? 'italic' : undefined
  const textAlignRaw = styleMap['text-align']
  const textAlign = textAlignRaw && ['left', 'center', 'right', 'justify'].includes(textAlignRaw)
    ? textAlignRaw as SlideComponentStyle['textAlign']
    : undefined

  return {
    fontSize: fontSizeLength && isPxLike(fontSizeLength) ? fontSizeLength.value : undefined,
    fontWeight: Number.isFinite(fontWeight) ? fontWeight : undefined,
    color,
    backgroundColor,
    fontStyle,
    lineHeight: lineHeightLength && isPxLike(lineHeightLength) ? lineHeightLength.value : undefined,
    textAlign,
  }
}

function getCanvasRoot(doc: Document): HTMLElement | null {
  return (
    doc.querySelector<HTMLElement>('[data-slide-root]') ||
    doc.querySelector<HTMLElement>('.slide-canvas') ||
    doc.body.firstElementChild as HTMLElement | null ||
    null
  )
}

function shouldImportNode(node: HTMLElement): boolean {
  const style = parseInlineStyle(node.getAttribute('style') || '')
  const hasPositionInfo = style.position === 'absolute' || style.left !== undefined || style.top !== undefined
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

export function convertHtmlToSlideComponents(html: string): SlideImportResult {
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

  const warnings: string[] = []
  const rootStyle = parseInlineStyle(root.getAttribute('style') || '')
  const sourceCanvasWidth = parseCanvasPx(rootStyle.width ?? root.getAttribute('width') ?? undefined, 'width', warnings) ?? DEFAULT_CANVAS_WIDTH
  const sourceCanvasHeight = parseCanvasPx(rootStyle.height ?? root.getAttribute('height') ?? undefined, 'height', warnings) ?? DEFAULT_CANVAS_HEIGHT

  const scaleX = DEFAULT_CANVAS_WIDTH / sourceCanvasWidth
  const scaleY = DEFAULT_CANVAS_HEIGHT / sourceCanvasHeight

  if (sourceCanvasWidth !== DEFAULT_CANVAS_WIDTH || sourceCanvasHeight !== DEFAULT_CANVAS_HEIGHT) {
    warnings.push('Normalized imported canvas from ' + sourceCanvasWidth + 'x' + sourceCanvasHeight + ' to ' + DEFAULT_CANVAS_WIDTH + 'x' + DEFAULT_CANVAS_HEIGHT + '.')
  }

  const absoluteNodes = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(shouldImportNode)
  const fallbackNodes = Array.from(root.children).filter((node): node is HTMLElement => node instanceof HTMLElement)
  const nodes = absoluteNodes.length > 0 ? absoluteNodes : fallbackNodes

  if (absoluteNodes.length === 0) {
    warnings.push('No absolutely positioned elements found; imported top-level nodes as fallback.')
  }

  const components: SlideComponent[] = nodes.map((node, index) => {
    const styleMap = parseInlineStyle(node.getAttribute('style') || '')
    const nodeLabel = getNodeLabel(node)
    const sanitizedNode = sanitizeNode(node)
    const content = sanitizedNode.innerHTML.trim() || sanitizedNode.outerHTML.trim()

    const transformOffsets = parseTransformOffsets(styleMap.transform, nodeLabel, warnings)

    const baseX = parseStylePx(styleMap, 'left', nodeLabel, warnings) ?? 0
    const baseY = parseStylePx(styleMap, 'top', nodeLabel, warnings) ?? 0
    const baseWidth = parseStylePx(styleMap, 'width', nodeLabel, warnings)
      ?? parseAttrPx(node.getAttribute('width'), 'width', nodeLabel, warnings)
      ?? 320
    const baseHeight = parseStylePx(styleMap, 'height', nodeLabel, warnings)
      ?? parseAttrPx(node.getAttribute('height'), 'height', nodeLabel, warnings)

    if (styleMap.left === undefined || styleMap.top === undefined) {
      warnings.push('Node "' + nodeLabel + '" had no explicit left/top; defaulted to 0.')
    }

    return {
      id: 'import-' + String(index + 1).padStart(3, '0'),
      type: inferType(node),
      x: scaleValue(baseX + transformOffsets.x, scaleX),
      y: scaleValue(baseY + transformOffsets.y, scaleY),
      width: scaleValue(baseWidth, scaleX),
      height: baseHeight === undefined ? undefined : scaleValue(baseHeight, scaleY),
      content,
      style: extractStyle(styleMap),
      locked: false,
      visible: true,
    }
  })

  return {
    canvas: { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT },
    components,
    warnings: Array.from(new Set(warnings)),
  }
}
