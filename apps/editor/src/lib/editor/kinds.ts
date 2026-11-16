import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { getTrackName, isName, readFunctionKind, readMethodKind, type Kind } from '@lovechild/strudel'
import type { SyntaxNode, Tree } from '@lezer/common'

export interface KindMark {
    from: number
    to: number
    kind: Kind
    isQuiet: boolean
}

export interface Block {
    from: number
    to: number
    kind: Kind | undefined
}

export interface Kinds {
    marks: ReadonlyArray<KindMark>
    blocks: ReadonlyArray<Block>
}

interface Scope {
    names: Map<string, Kind | undefined>
    parent: Scope | undefined
}

interface Found {
    kind: Kind | undefined
}

const trackMethod = 'track'

const passes = 2

const lookUp = (scope: Scope | undefined, name: string): Found | undefined => {
    for (let current = scope; current; current = current.parent) {
        if (current.names.has(name)) {
            return { kind: current.names.get(name) }
        }
    }

    return undefined
}

const getChildren = (node: SyntaxNode) => {
    const children: Array<SyntaxNode> = []

    for (let child = node.firstChild; child; child = child.nextSibling) {
        children.push(child)
    }

    return children
}

const analyse = (state: EditorState): Kinds => {
    const globals = new Map<string, Kind | undefined>()
    const root: Scope = { names: globals, parent: undefined }
    let marks: Array<KindMark> = []
    let blocks: Array<Block> = []

    const readText = (node: SyntaxNode) => state.sliceDoc(node.from, node.to)

    const mark = (node: SyntaxNode, kind: Kind | undefined, isQuiet = false) => {
        if (kind) {
            marks.push({ from: node.from, to: node.to, kind, isQuiet })
        }
    }

    const readName = (node: SyntaxNode, scope: Scope) => {
        const name = readText(node)
        const found = lookUp(scope, name)
        return found ? found.kind : readFunctionKind(name)
    }

    const visitChildren = (node: SyntaxNode, scope: Scope) => {
        for (const child of getChildren(node)) {
            visit(child, scope)
        }
    }

    const visitFunction = (node: SyntaxNode, scope: Scope, parameterKind: Kind | undefined) => {
        const local: Scope = { names: new Map(), parent: scope }

        for (const definition of node.getChild('ParamList')?.getChildren('VariableDefinition') ?? []) {
            local.names.set(readText(definition), parameterKind)
            mark(definition, parameterKind)
        }

        const body = node.lastChild

        if (!body) {
            return undefined
        }

        if (body.name !== 'Block') {
            return visit(body, local)
        }

        let result: Kind | undefined

        for (const child of getChildren(body)) {
            const kind = visit(child, local)

            if (child.name === 'ReturnStatement') {
                result = kind
            }
        }

        return result
    }

    const visitArguments = (list: SyntaxNode | null, scope: Scope, receiver: Kind | undefined) => {
        for (const child of list ? getChildren(list) : []) {
            if (child.name === 'ArrowFunction') {
                visitFunction(child, scope, receiver)
            } else {
                visit(child, scope)
            }
        }
    }

    const recordTrack = (list: SyntaxNode | null, kind: Kind | undefined) => {
        const argument = list?.getChild('String')

        if (!argument) {
            return
        }

        const name = getTrackName(readText(argument).slice(1, -1))

        if (isName(name)) {
            globals.set(name, kind)
            mark(argument, kind)
        }
    }

    const visitMember = (node: SyntaxNode, scope: Scope) => {
        const [receiver, ...rest] = getChildren(node)
        const property = node.lastChild
        const receiverKind = receiver ? visit(receiver, scope) : undefined

        if (property?.name !== 'PropertyName') {
            rest.forEach((child) => visit(child, scope))
            return { receiverKind, kind: undefined, name: undefined }
        }

        const name = readText(property)
        const kind = readMethodKind(receiverKind, name)
        mark(property, kind, kind === receiverKind)
        return { receiverKind, kind, name }
    }

    const visitCall = (node: SyntaxNode, scope: Scope) => {
        const callee = node.firstChild
        const list = node.getChild('ArgList')

        if (callee?.name !== 'MemberExpression') {
            const kind = callee ? visit(callee, scope) : undefined
            visitArguments(list, scope, undefined)
            return kind
        }

        const { receiverKind, kind, name } = visitMember(callee, scope)
        visitArguments(list, scope, receiverKind)

        if (name === trackMethod) {
            recordTrack(list, receiverKind)
        }

        return kind
    }

    const visitDeclaration = (node: SyntaxNode, scope: Scope) => {
        for (const definition of node.getChildren('VariableDefinition')) {
            const equals = definition.nextSibling
            const value = equals?.name === 'Equals' ? equals.nextSibling : null
            const kind = value ? visit(value, scope) : undefined
            scope.names.set(readText(definition), kind)
            mark(definition, kind)
        }
    }

    const visitLabel = (node: SyntaxNode, scope: Scope) => {
        const label = node.getChild('Label')
        const body = node.lastChild
        const kind = body && body !== label ? visit(body, scope) : undefined

        if (!label) {
            return
        }

        const name = getTrackName(readText(label))

        if (isName(name)) {
            globals.set(name, kind)
        }

        mark(label, kind)
        blocks.push({ from: node.from, to: node.to, kind })
    }

    const visit = (node: SyntaxNode, scope: Scope): Kind | undefined => {
        switch (node.name) {
            case 'VariableName': {
                const kind = readName(node, scope)
                mark(node, kind)
                return kind
            }
            case 'String':
            case 'TemplateString': {
                visitChildren(node, scope)
                return 'neutral'
            }
            case 'Number': {
                return 'neutral'
            }
            case 'ParenthesizedExpression': {
                const inner = node.firstChild?.nextSibling
                return inner ? visit(inner, scope) : undefined
            }
            case 'ExpressionStatement': {
                return node.firstChild ? visit(node.firstChild, scope) : undefined
            }
            case 'ReturnStatement': {
                const value = getChildren(node).find((child) => child.name !== 'return' && child.name !== ';')
                return value ? visit(value, scope) : undefined
            }
            case 'CallExpression': {
                return visitCall(node, scope)
            }
            case 'MemberExpression': {
                return visitMember(node, scope).kind
            }
            case 'ArrowFunction': {
                return visitFunction(node, scope, undefined)
            }
            case 'VariableDeclaration': {
                visitDeclaration(node, scope)
                return undefined
            }
            case 'LabeledStatement': {
                visitLabel(node, scope)
                return undefined
            }
            default: {
                visitChildren(node, scope)
                return undefined
            }
        }
    }

    for (let pass = 0; pass < passes; pass += 1) {
        marks = []
        blocks = []
        visitChildren(syntaxTree(state).topNode, root)
    }

    return { marks, blocks }
}

const cache = new WeakMap<Tree, Kinds>()

export const readKinds = (state: EditorState) => {
    const tree = syntaxTree(state)
    const cached = cache.get(tree)

    if (cached) {
        return cached
    }

    const kinds = analyse(state)
    cache.set(tree, kinds)
    return kinds
}
