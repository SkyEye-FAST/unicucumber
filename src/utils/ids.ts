export type IdsNode =
  | { type: 'character'; value: string }
  | { type: 'operator'; operator: string; children: IdsNode[] }

const IDS_ARITY = new Map<string, number>([
  ['⿾', 1],
  ['⿿', 1],
  ['⿰', 2],
  ['⿱', 2],
  ['⿴', 2],
  ['⿵', 2],
  ['⿶', 2],
  ['⿷', 2],
  ['⿸', 2],
  ['⿹', 2],
  ['⿺', 2],
  ['⿻', 2],
  ['⿼', 2],
  ['⿽', 2],
  ['㇯', 2],
  ['⿲', 3],
  ['⿳', 3],
])

interface ParseResult {
  node: IdsNode
  nextIndex: number
}

const parseNode = (tokens: string[], index: number): ParseResult | null => {
  const token = tokens[index]
  if (token === undefined) return null

  const arity = IDS_ARITY.get(token)
  if (arity === undefined) {
    return {
      node: { type: 'character', value: token },
      nextIndex: index + 1,
    }
  }

  const children: IdsNode[] = []
  let nextIndex = index + 1
  for (let childIndex = 0; childIndex < arity; childIndex += 1) {
    const child = parseNode(tokens, nextIndex)
    if (child === null) return null
    children.push(child.node)
    nextIndex = child.nextIndex
  }

  return {
    node: { type: 'operator', operator: token, children },
    nextIndex,
  }
}

export const parseIds = (expression: string): IdsNode | null => {
  const tokens = [...expression.trim()]
  if (tokens.length === 0) return null
  const result = parseNode(tokens, 0)
  return result !== null && result.nextIndex === tokens.length
    ? result.node
    : null
}
