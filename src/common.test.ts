/// <reference types="bun-types" />
import { expect, describe, it } from 'bun:test'
import { generateRandom } from './common'

describe('generateRandom', () => {
  it('should generate a random string', () => {
    expect(generateRandom()).not.toEqual(generateRandom())
  })
  it('should generate 4 characters per round', () => {
    expect(generateRandom(1).length).toEqual(4)
    expect(generateRandom(2).length).toEqual(8)
    expect(generateRandom(3).length).toEqual(12)
    expect(generateRandom(8).length).toEqual(32)
  })
})
