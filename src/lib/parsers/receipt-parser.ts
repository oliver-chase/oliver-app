// Client-side Best Buy receipt parser for plain text exports.
// Images and scanned PDFs cannot be parsed client-side — call the API for those.

export interface ParsedReceipt {
  purchaseDate: string | null
  serialNumber: string | null
  imei: string | null
  deviceType: string | null
  deviceName: string | null
  customerName: string | null
  price: string | null
  orderId: string | null
  gaps: string[]
}

const DEVICE_KEYWORDS: Record<string, string> = {
  'iphone': 'iPhone',
  'ipad': 'iPad',
  'macbook': 'MacBook',
  'mac mini': 'Mac mini',
  'mac pro': 'Mac Pro',
  'imac': 'iMac',
  'apple watch': 'Apple Watch',
  'airpods': 'AirPods',
  'samsung galaxy': 'Samsung Galaxy',
  'surface': 'Microsoft Surface',
  'laptop': 'Laptop',
  'tablet': 'Tablet',
  'monitor': 'Monitor',
  'keyboard': 'Keyboard',
  'mouse': 'Mouse',
  'headphones': 'Headphones',
}

function findDate(text: string): string | null {
  // ISO: 2025-01-15
  let m = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (m) return m[1]
  // US: 01/15/2025
  m = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/)
  if (m) return m[1]
  // Written: January 15, 2025 or Jan 15, 2025
  m = text.match(/\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b/i)
  if (m) return m[1]
  return null
}

function findSerial(text: string): string | null {
  // "Serial Number: C02X12345ABCD" or "S/N: XXX" or "SN: XXX"
  const m = text.match(/(?:Serial\s*(?:Number|No\.?|#)|S\/N|SN)[:\s]+([A-Z0-9]{6,20})/i)
  return m ? m[1] : null
}

function findImei(text: string): string | null {
  const m = text.match(/\bIMEI[:\s]+(\d{15})\b/i)
  return m ? m[1] : null
}

function findDeviceType(text: string): { type: string; name: string } | null {
  const lower = text.toLowerCase()
  for (const [keyword, label] of Object.entries(DEVICE_KEYWORDS)) {
    const idx = lower.indexOf(keyword)
    if (idx === -1) continue
    // Try to get the full product name: grab the line containing the keyword
    const lineStart = text.lastIndexOf('\n', idx) + 1
    const lineEnd = text.indexOf('\n', idx)
    const line = text.slice(lineStart, lineEnd > 0 ? lineEnd : undefined).trim()
    // Strip leading price/qty patterns
    const name = line.replace(/^\s*\d+\s+x\s+/i, '').replace(/^\s*[\$\d.,]+\s+/, '').trim()
    return { type: label, name: name.slice(0, 100) }
  }
  return null
}

function findCustomerName(text: string): string | null {
  // "Sold to: John Smith" or "Customer: John Smith" or "Bill to: John Smith"
  const m = text.match(/(?:Sold\s+to|Customer|Bill(?:ed)?\s+to|Ship(?:ped)?\s+to)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i)
  return m ? m[1].trim() : null
}

function findPrice(text: string): string | null {
  // Total price line: "Total: $999.99" or "Order Total $999.99"
  const m = text.match(/(?:Order\s+)?Total[:\s]+\$?([\d,]+\.\d{2})/i)
  return m ? '$' + m[1] : null
}

function findOrderId(text: string): string | null {
  const m = text.match(/(?:Order|Invoice|Confirmation|Receipt)\s*(?:Number|No\.?|#)[:\s]+([A-Z0-9-]{6,20})/i)
  return m ? m[1] : null
}

export function parseReceipt(text: string): ParsedReceipt {
  const purchaseDate = findDate(text)
  const serialNumber = findSerial(text)
  const imei = findImei(text)
  const deviceInfo = findDeviceType(text)
  const customerName = findCustomerName(text)
  const price = findPrice(text)
  const orderId = findOrderId(text)

  const gaps: string[] = []
  if (!purchaseDate) gaps.push('purchase date')
  if (!serialNumber && !imei) gaps.push('serial number or IMEI')
  if (!deviceInfo) gaps.push('device type and name')
  if (!customerName) gaps.push('customer name')

  return {
    purchaseDate,
    serialNumber,
    imei,
    deviceType: deviceInfo?.type ?? null,
    deviceName: deviceInfo?.name ?? null,
    customerName,
    price,
    orderId,
    gaps,
  }
}

export function receiptToSummary(r: ParsedReceipt): string {
  const lines: string[] = []
  if (r.deviceName) lines.push('Device: ' + r.deviceName)
  else if (r.deviceType) lines.push('Type: ' + r.deviceType)
  if (r.serialNumber) lines.push('Serial: ' + r.serialNumber)
  if (r.imei) lines.push('IMEI: ' + r.imei)
  if (r.purchaseDate) lines.push('Date: ' + r.purchaseDate)
  if (r.customerName) lines.push('Customer: ' + r.customerName)
  if (r.price) lines.push('Price: ' + r.price)
  if (r.orderId) lines.push('Order: ' + r.orderId)
  if (r.gaps.length) lines.push('\nMissing: ' + r.gaps.join(', '))
  return lines.join('\n')
}
