import { describe, expect, it } from 'vitest'

import { parseIds } from './ids'

describe('parseIds', () => {
  it('parses nested binary IDS expressions', () => {
    expect(parseIds('⿰日月')).toEqual({
      type: 'operator',
      operator: '⿰',
      children: [
        { type: 'character', value: '日' },
        { type: 'character', value: '月' },
      ],
    })

    expect(parseIds('⿱⿰日月木')).toEqual({
      type: 'operator',
      operator: '⿱',
      children: [
        {
          type: 'operator',
          operator: '⿰',
          children: [
            { type: 'character', value: '日' },
            { type: 'character', value: '月' },
          ],
        },
        { type: 'character', value: '木' },
      ],
    })
  })

  it('uses ternary arity for ternary IDS operators', () => {
    const node = parseIds('⿲ABC')

    expect(node?.type).toBe('operator')
    if (node?.type === 'operator') expect(node.children).toHaveLength(3)
  })

  it('supports current unary and extended binary IDS operators', () => {
    expect(parseIds('⿾正')).toEqual({
      type: 'operator',
      operator: '⿾',
      children: [{ type: 'character', value: '正' }],
    })
    expect(parseIds('㇯其㇒')).toEqual({
      type: 'operator',
      operator: '㇯',
      children: [
        { type: 'character', value: '其' },
        { type: 'character', value: '㇒' },
      ],
    })
  })

  it('rejects missing children and trailing content', () => {
    expect(parseIds('⿰日')).toBeNull()
    expect(parseIds('⿰日月木')).toBeNull()
    expect(parseIds('')).toBeNull()
  })
})
