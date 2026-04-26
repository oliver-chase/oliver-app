import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCampaignIcsPayload, toIcsTimestamp } from '../../src/lib/campaign-ics.js'

function assertIcsTimestamp(value, fieldName) {
  assert.match(value, /^\d{8}T\d{6}Z$/, `${fieldName} uses UTC iCalendar format`)
}

test('campaign ICS payload includes required fields and deterministic policy', { concurrency: false }, () => {
  const payload = buildCampaignIcsPayload({
    item: {
      id: 'content-abc',
      title: 'Launch Update\\nLine',
      body: 'Body line 1\\nBody line 2',
    },
    scheduledIso: '2026-04-26T12:34:56.789Z',
    modulePath: '/campaigns',
    windowLocation: { origin: 'https://staging.vtwo.ai' },
  })

  const lines = payload.split('\r\n')
  assert.equal(lines[0], 'BEGIN:VCALENDAR')
  assert.equal(lines[1], 'VERSION:2.0')
  assert.equal(lines[2], 'PRODID:-//V.Two//Campaign Content Posting//EN')
  assert.equal(lines[3], 'BEGIN:VEVENT')
  assert.ok(lines.includes('UID:content-abc@vtwo-campaigns'))
  assert.ok(lines.includes('SUMMARY:Launch Update Line'))
  assert.ok(lines.includes('DESCRIPTION:Body line 1 Body line 2 | Open in campaign module: https://staging.vtwo.ai/campaigns?content=content-abc'))

  const dtstamp = lines.find(line => line.startsWith('DTSTAMP:'))
  const dtstart = lines.find(line => line.startsWith('DTSTART:'))
  const dtend = lines.find(line => line.startsWith('DTEND:'))
  assert.ok(dtstamp && dtstart && dtend)
  assertIcsTimestamp(dtstamp?.slice('DTSTAMP:'.length), 'DTSTAMP')
  assertIcsTimestamp(dtstart?.slice('DTSTART:'.length), 'DTSTART')
  assertIcsTimestamp(dtend?.slice('DTEND:'.length), 'DTEND')

  const startValue = dtstart?.slice('DTSTART:'.length)
  const endValue = dtend?.slice('DTEND:'.length)
  assert.ok(startValue < endValue, 'DTSTART should be before DTEND')
  assert.ok(lines.includes('END:VEVENT'))
  assert.equal(lines.at(-1), 'END:VCALENDAR')
})
