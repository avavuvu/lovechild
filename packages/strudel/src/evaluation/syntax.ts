import { parse, type AnyNode, type Comment, type Options, type Program, type Token } from 'acorn'
import { fullAncestor } from 'acorn-walk'

export interface Parsed {
    program: Program
    tokens: ReadonlyArray<Token>
    comments: ReadonlyArray<Comment>
}

export const parseCode = (code: string, options: Omit<Options, 'ecmaVersion'> = {}): Parsed | undefined => {
    const tokens: Array<Token> = []
    const comments: Array<Comment> = []

    try {
        const program = parse(code, { ...options, ecmaVersion: 2022, allowAwaitOutsideFunction: true, onToken: tokens, onComment: comments })
        return { program, tokens, comments }
    } catch {
        return undefined
    }
}

export const visit = (root: AnyNode, enter: (node: AnyNode, ancestors: ReadonlyArray<AnyNode>) => void) => {
    fullAncestor(root, (node, _state, ancestors) => enter(node as AnyNode, ancestors as ReadonlyArray<AnyNode>))
}
