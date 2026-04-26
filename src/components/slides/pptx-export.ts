import type { SlideComponent } from '@/components/slides/types'
import type { SlideCanvas } from '@/components/slides/persistence-types'

export interface SlidePptxExportInput {
  id: string
  title: string
  canvas: SlideCanvas
  components: SlideComponent[]
}

export interface SlidePptxExportResult {
  blob: Blob
  warnings: string[]
  slideCount: number
}

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const P_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main'
const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

const SLIDE_WIDTH_EMU = 9_144_000
const SLIDE_HEIGHT_EMU = 5_143_500

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function toDosDateTime(value = new Date()): { date: number; time: number } {
  const year = Math.max(1980, value.getFullYear())
  const month = value.getMonth() + 1
  const day = value.getDate()
  const hours = value.getHours()
  const minutes = value.getMinutes()
  const seconds = Math.floor(value.getSeconds() / 2)

  const date = ((year - 1980) << 9) | (month << 5) | day
  const time = (hours << 11) | (minutes << 5) | seconds
  return { date, time }
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

function buildZipStore(entries: Array<{ path: string; data: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  const dos = toDosDateTime()

  for (const entry of entries) {
    const name = encoder.encode(entry.path)
    const data = entry.data
    const crc = crc32(data)

    const localHeader = new Uint8Array(30)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, dos.time, true)
    localView.setUint16(12, dos.date, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, data.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, name.length, true)
    localView.setUint16(28, 0, true)

    const localChunk = concatBytes([localHeader, name, data])
    locals.push(localChunk)

    const centralHeader = new Uint8Array(46)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, dos.time, true)
    centralView.setUint16(14, dos.date, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, data.length, true)
    centralView.setUint32(24, data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, offset, true)

    centrals.push(concatBytes([centralHeader, name]))
    offset += localChunk.length
  }

  const centralSize = centrals.reduce((sum, entry) => sum + entry.length, 0)
  const endHeader = new Uint8Array(22)
  const endView = new DataView(endHeader.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  endView.setUint16(20, 0, true)

  return concatBytes([...locals, ...centrals, endHeader])
}

function escXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toPlainText(html: string): string {
  const withLineBreaks = html
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
  const noTags = withLineBreaks.replace(/<[^>]*>/g, '')
  return noTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
}

function normalizeHexColor(value: string | undefined): string | null {
  if (!value) return null
  const raw = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw.slice(1).toUpperCase()
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    const [, r, g, b] = raw
    return `${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  const rgbMatch = raw.match(/^rgb\(([^,]+),\s*([^,]+),\s*([^\)]+)\)$/)
  if (rgbMatch) {
    const vals = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map((part) => Number.parseInt(part.trim(), 10))
    if (vals.every((part) => Number.isFinite(part) && part >= 0 && part <= 255)) {
      return vals.map((part) => part.toString(16).padStart(2, '0')).join('').toUpperCase()
    }
  }
  return null
}

function toEmu(px: number, scale: number): number {
  return Math.max(0, Math.round(px * scale))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function fontSizeForComponent(component: SlideComponent): number {
  if (typeof component.style.fontSize === 'number' && component.style.fontSize > 0) {
    return component.style.fontSize
  }
  if (component.type === 'heading') return 54
  if (component.type === 'subheading') return 36
  if (component.type === 'stat') return 40
  return 24
}

function defaultHeightForComponent(component: SlideComponent, text: string): number {
  if (typeof component.height === 'number' && component.height > 0) return component.height
  const lines = Math.max(1, text.split('\n').length)
  const estimated = Math.ceil(fontSizeForComponent(component) * 1.4 * lines + 18)
  return clamp(estimated, 40, 800)
}

function buildTextParagraphs(text: string, fontSizePt: number, textColorHex: string, align: string, bold: boolean, italic: boolean): string {
  const lines = text.split('\n')
  const size = Math.max(8, Math.min(120, Math.round(fontSizePt * 100)))
  const boldAttr = bold ? ' b="1"' : ''
  const italicAttr = italic ? ' i="1"' : ''

  return lines
    .map((line) => {
      const content = line.trim().length > 0 ? line : ' '
      return `<a:p><a:pPr algn="${align}"/><a:r><a:rPr lang="en-US" sz="${size}"${boldAttr}${italicAttr}><a:solidFill><a:srgbClr val="${textColorHex}"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${escXml(content)}</a:t></a:r><a:endParaRPr lang="en-US" sz="${size}"/></a:p>`
    })
    .join('')
}

function buildShapeXml(
  component: SlideComponent,
  shapeId: number,
  scaleX: number,
  scaleY: number,
  slideRef: string,
  warnings: string[],
): string {
  if (component.visible === false) {
    warnings.push(`${slideRef}: component ${component.id} (${component.type}) was hidden and was skipped in PPTX export.`)
    return ''
  }
  if (
    typeof component.style.backgroundColor === 'string'
    && component.style.backgroundColor.trim().length > 0
    && !normalizeHexColor(component.style.backgroundColor)
    && /gradient|url\(|pattern/i.test(component.style.backgroundColor)
  ) {
    warnings.push(`${slideRef}: component ${component.id} (${component.type}) uses unsupported background style; simplified style was used in PPTX export.`)
  }
  if (component.type === 'logo') {
    warnings.push(`${slideRef}: component ${component.id} (${component.type}) exported as warning only; native logo/image mapping not yet supported.`)
    return ''
  }

  const text = toPlainText(component.content || '')
  if (!text && !component.style.backgroundColor) {
    warnings.push(`${slideRef}: component ${component.id} skipped because it contains no text content.`)
    return ''
  }

  const x = toEmu(component.x, scaleX)
  const y = toEmu(component.y, scaleY)
  const w = toEmu(component.width, scaleX)
  const h = toEmu(defaultHeightForComponent(component, text), scaleY)

  const textColorHex = normalizeHexColor(component.style.color) || '111111'
  const fillHex = normalizeHexColor(component.style.backgroundColor)
  const hasFill = !!fillHex || ['card', 'panel', 'row', 'stat'].includes(component.type)
  const resolvedFill = fillHex || 'F3F4F6'
  const align = component.style.textAlign === 'center'
    ? 'ctr'
    : component.style.textAlign === 'right'
      ? 'r'
      : component.style.textAlign === 'justify'
        ? 'just'
        : 'l'
  const fontSize = fontSizeForComponent(component)
  const bold = (component.style.fontWeight || 0) >= 600 || component.type === 'heading'
  const italic = component.style.fontStyle === 'italic'
  const shapeGeom = ['card', 'panel'].includes(component.type) ? 'roundRect' : 'rect'

  const spPr = hasFill
    ? `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="${shapeGeom}"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${resolvedFill}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>`
    : `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>`

  const txBody = `<p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${buildTextParagraphs(text || component.type, fontSize, textColorHex, align, bold, italic)}</p:txBody>`

  return `<p:sp><p:nvSpPr><p:cNvPr id="${shapeId}" name="${escXml(component.type + '-' + component.id)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>${spPr}${txBody}</p:sp>`
}

function buildSlideXml(slide: SlidePptxExportInput, slideIndex: number, warnings: string[]): string {
  const safeWidth = Math.max(1, slide.canvas.width || 1920)
  const safeHeight = Math.max(1, slide.canvas.height || 1080)
  const scaleX = SLIDE_WIDTH_EMU / safeWidth
  const scaleY = SLIDE_HEIGHT_EMU / safeHeight
  const slideRef = `slide ${slideIndex + 1} (${slide.title || slide.id})`

  const shapes: string[] = []
  let shapeId = 2
  for (const component of slide.components) {
    const shapeXml = buildShapeXml(component, shapeId, scaleX, scaleY, slideRef, warnings)
    if (!shapeXml) continue
    shapes.push(shapeXml)
    shapeId += 1
  }

  if (shapes.length === 0) {
    const fallback = `<p:sp><p:nvSpPr><p:cNvPr id="2" name="fallback-note"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="8229600" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1800"><a:solidFill><a:srgbClr val="666666"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${escXml('This slide had no exportable native components.')}</a:t></a:r><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>`
    shapes.push(fallback)
    warnings.push(`${slideRef}: no exportable components found; added fallback note.`)
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld xmlns:a="${A_NS}" xmlns:r="${R_NS}" xmlns:p="${P_NS}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
}

function buildContentTypesXml(slideCount: number): string {
  const slideOverrides = Array.from({ length: slideCount }, (_, index) =>
    `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
  ).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${slideOverrides}</Types>`
}

function buildPresentationXml(slideCount: number): string {
  const slideIds = Array.from({ length: slideCount }, (_, index) =>
    `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`,
  ).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:presentation xmlns:a="${A_NS}" xmlns:r="${R_NS}" xmlns:p="${P_NS}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${SLIDE_WIDTH_EMU}" cy="${SLIDE_HEIGHT_EMU}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`
}

function buildPresentationRelsXml(slideCount: number): string {
  const slideRels = Array.from({ length: slideCount }, (_, index) =>
    `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`,
  ).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slideRels}</Relationships>`
}

function buildRootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`
}

function buildSlideMasterXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sldMaster xmlns:a="${A_NS}" xmlns:r="${R_NS}" xmlns:p="${P_NS}"><p:cSld name="Master"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`
}

function buildSlideMasterRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`
}

function buildSlideLayoutXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sldLayout xmlns:a="${A_NS}" xmlns:r="${R_NS}" xmlns:p="${P_NS}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
}

function buildSlideLayoutRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`
}

function buildThemeXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<a:theme xmlns:a="${A_NS}" name="Oliver Theme"><a:themeElements><a:clrScheme name="Oliver"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F2937"/></a:dk2><a:lt2><a:srgbClr val="F9FAFB"/></a:lt2><a:accent1><a:srgbClr val="EC4899"/></a:accent1><a:accent2><a:srgbClr val="3B82F6"/></a:accent2><a:accent3><a:srgbClr val="10B981"/></a:accent3><a:accent4><a:srgbClr val="F59E0B"/></a:accent4><a:accent5><a:srgbClr val="8B5CF6"/></a:accent5><a:accent6><a:srgbClr val="EF4444"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="Oliver"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Oliver"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`
}

function buildSlideRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`
}

function buildAppPropsXml(slideCount: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Oliver App</Application><Slides>${slideCount}</Slides><PresentationFormat>Widescreen</PresentationFormat></Properties>`
}

function buildCorePropsXml(): string {
  const iso = new Date().toISOString()
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Oliver Slide Export</dc:title><dc:creator>Oliver App</dc:creator><cp:lastModifiedBy>Oliver App</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`
}

export function convertSlidesToPptx(slidesInput: SlidePptxExportInput[]): SlidePptxExportResult {
  if (!Array.isArray(slidesInput) || slidesInput.length === 0) {
    throw new Error('At least one slide is required for PPTX export.')
  }

  const slides = slidesInput.map((slide) => ({
    ...slide,
    title: slide.title || slide.id,
    canvas: {
      width: Math.max(1, Number(slide.canvas?.width || 1920)),
      height: Math.max(1, Number(slide.canvas?.height || 1080)),
    },
    components: Array.isArray(slide.components) ? slide.components : [],
  }))

  const warnings: string[] = []
  const encoder = new TextEncoder()
  const entries: Array<{ path: string; data: Uint8Array }> = []

  entries.push({ path: '[Content_Types].xml', data: encoder.encode(buildContentTypesXml(slides.length)) })
  entries.push({ path: '_rels/.rels', data: encoder.encode(buildRootRelsXml()) })
  entries.push({ path: 'docProps/app.xml', data: encoder.encode(buildAppPropsXml(slides.length)) })
  entries.push({ path: 'docProps/core.xml', data: encoder.encode(buildCorePropsXml()) })
  entries.push({ path: 'ppt/presentation.xml', data: encoder.encode(buildPresentationXml(slides.length)) })
  entries.push({ path: 'ppt/_rels/presentation.xml.rels', data: encoder.encode(buildPresentationRelsXml(slides.length)) })
  entries.push({ path: 'ppt/slideMasters/slideMaster1.xml', data: encoder.encode(buildSlideMasterXml()) })
  entries.push({ path: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: encoder.encode(buildSlideMasterRelsXml()) })
  entries.push({ path: 'ppt/slideLayouts/slideLayout1.xml', data: encoder.encode(buildSlideLayoutXml()) })
  entries.push({ path: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: encoder.encode(buildSlideLayoutRelsXml()) })
  entries.push({ path: 'ppt/theme/theme1.xml', data: encoder.encode(buildThemeXml()) })

  slides.forEach((slide, index) => {
    const slideXml = buildSlideXml(slide, index, warnings)
    entries.push({ path: `ppt/slides/slide${index + 1}.xml`, data: encoder.encode(slideXml) })
    entries.push({ path: `ppt/slides/_rels/slide${index + 1}.xml.rels`, data: encoder.encode(buildSlideRelsXml()) })
  })

  const zipBytes = buildZipStore(entries)
  const zipBuffer = new ArrayBuffer(zipBytes.byteLength)
  new Uint8Array(zipBuffer).set(zipBytes)
  const blob = new Blob([zipBuffer], { type: PPTX_MIME })
  return {
    blob,
    warnings,
    slideCount: slides.length,
  }
}
