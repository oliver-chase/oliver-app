export type SlideComponentType =
  | 'text'
  | 'heading'
  | 'subheading'
  | 'card'
  | 'row'
  | 'stat'
  | 'logo'
  | 'tag-line'
  | 'panel'

export interface SlideComponentStyle {
  fontSize?: number
  fontWeight?: number
  color?: string
  backgroundColor?: string
  fontStyle?: 'normal' | 'italic'
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right' | 'justify'
}

export interface SlideComponent {
  id: string
  type: SlideComponentType
  sourceLabel?: string
  x: number
  y: number
  width: number
  height?: number
  content: string
  style: SlideComponentStyle
  locked: boolean
  visible: boolean
}

export interface SlideImportResult {
  canvas: {
    width: number
    height: number
  }
  components: SlideComponent[]
  warnings: string[]
}
