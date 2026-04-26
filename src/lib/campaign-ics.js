export function toIcsTimestamp(input) {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ICS timestamp input: ${input}`)
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function normalizeLineValue(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .trim()
}

function buildIcsDescription(item, modulePath, windowLocation) {
  const description = normalizeLineValue(item.body) || 'Review and post claimed campaign content.'
  const fallbackOrigin = windowLocation && windowLocation.origin ? windowLocation.origin : 'https://app.local'
  const route = `${fallbackOrigin}${modulePath}?content=${encodeURIComponent(item.id)}`
  return `${description} | Open in campaign module: ${route}`
}

export function buildCampaignIcsPayload({
  item,
  scheduledIso,
  modulePath = '/campaigns',
  windowLocation = null,
}) {
  const parsedScheduled = new Date(scheduledIso)
  if (Number.isNaN(parsedScheduled.getTime())) {
    throw new Error(`Invalid scheduled time for ICS payload: ${scheduledIso}`)
  }

  const startIso = parsedScheduled.toISOString()
  const endDate = new Date(parsedScheduled.getTime() + 30 * 60 * 1000)
  const title = normalizeLineValue(item.title) || 'Campaign posting reminder'
  const description = buildIcsDescription(item, modulePath, windowLocation)

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//V.Two//Campaign Content Posting//EN',
    'BEGIN:VEVENT',
    `UID:${item.id}@vtwo-campaigns`,
    `DTSTAMP:${toIcsTimestamp(new Date().toISOString())}`,
    `DTSTART:${toIcsTimestamp(startIso)}`,
    `DTEND:${toIcsTimestamp(endDate.toISOString())}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function buildIcsPayloadForBrowser(item, scheduledIso) {
  if (typeof window === 'undefined') {
    return buildCampaignIcsPayload({
      item,
      scheduledIso,
      modulePath: '/campaigns',
      windowLocation: null,
    })
  }

  return buildCampaignIcsPayload({
    item,
    scheduledIso,
    modulePath: '/campaigns',
    windowLocation: {
      origin: window.location.origin,
    },
  })
}
