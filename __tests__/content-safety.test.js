import { describe, it, expect } from '@jest/globals'

function violates(text) {
  const prohibited = ['nsfw','porn','sex','nude','explicit','xxx','adult','hate','racist','homophobic','terror','violence']
  const lc = String(text || '').toLowerCase()
  return prohibited.some(w => lc.includes(w))
}

describe('Content safety', () => {
  it('blocks prohibited words', () => {
    expect(violates('This contains porn')).toBe(true)
  })
  it('allows safe content', () => {
    expect(violates('Learning React components')).toBe(false)
  })
})
