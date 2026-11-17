import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { getBlockName, isName, readFunctionMedium, readMethodMedium, type Medium } from '@lovechild/strudel/editor'
import type { SyntaxNode, Tree } from '@lezer/common'

export interface MediumMark {
    from: number
    to: number
    medium: Medium
    isQuiet: boolean
}

export interface Block {
    from: number
    to: number
    medium: Medium | undefined
}

export interface Mediums {
    marks: ReadonlyArray<MediumMark>
    blocks: ReadonlyArray<Block>
}

interface Scope {
    names: Map<string, Medium | undefined>
    parent: Scope | undefined
}

interface Found {
    medium: Medium | undefined
}

const trackMethod = 'track'

const passes = 2

const lookUp = (scope: Scope | undefined, name: string): Found | undefined => {
    for (let current = scope; current; current = current.parent) {
        if (current.names.has(name)) {
            return { medium: current.names.get(name) }
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

const analyse = (state: EditorState): Mediums => {
    const globals = new Map<string, Medium | undefined>()
    const root: Scope = { names: globals, parent: undefined }
    let marks: Array<MediumMark> = []
    let blocks: Array<Block> = []

    const readText = (node: SyntaxNode) => state.sliceDoc(node.from, node.to)

    const mark = (node: SyntaxNode, medium: Medium | undefined, isQuiet = false) => {
        if (medium) {
            marks.push({ from: node.from, to: node.to, medium, isQuiet })
        }
    }

    const readName = (node: SyntaxNode, scope: Scope) => {
        const name = readText(node)
        const found = lookUp(scope, name)
        return found ? found.medium : readFunctionMedium(name)
    }

    const visitChildren = (node: SyntaxNode, scope: Scope) => {
        for (const child of getChildren(node)) {
            visit(child, scope)
        }
    }

    const visitFunction = (node: SyntaxNode, scope: Scope, parameterMedium: Medium | undefined) => {
        const local: Scope = { names: new Map(), parent: scope }

        for (const definition of node.getChild('ParamList')?.getChildren('VariableDefinition') ?? []) {
            local.names.set(readText(definition), parameterMedium)
            mark(definition, parameterMedium)
        }

        const body = node.lastChild

        if (!body) {
            return undefined
        }

        if (body.name !== 'Block') {
            return visit(body, local)
        }

        let result: Medium | undefined

        for (const child of getChildren(body)) {
            const medium = visit(child, local)

            if (child.name === 'ReturnStatement') {
                result = medium
            }
        }

        return result
    }

    const visitArguments = (list: SyntaxNode | null, scope: Scope, receiver: Medium | undefined) => {
        for (const child of list ? getChildren(list) : []) {
            if (child.name === 'ArrowFunction') {
                visitFunction(child, scope, receiver)
            } else {
                visit(child, scope)
            }
        }
    }

    const recordTrack = (list: SyntaxNode | null, medium: Medium | undefined) => {
        const argument = list?.getChild('String')

        if (!argument) {
            return
        }

        const name = getBlockName(readText(argument).slice(1, -1))

        if (isName(name)) {
            globals.set(name, medium)
            mark(argument, medium)
        }
    }

    const visitMember = (node: SyntaxNode, scope: Scope) => {
        const [receiver, ...rest] = getChildren(node)
        const property = node.lastChild
        const receiverMedium = receiver ? visit(receiver, scope) : undefined

        if (property?.name !== 'PropertyName') {
            rest.forEach((child) => visit(child, scope))
            return { receiverMedium, medium: undefined, name: undefined }
        }

        const name = readText(property)
        const medium = readMethodMedium(receiverMedium, name)
        mark(property, medium, medium === receiverMedium)
        return { receiverMedium, medium, name }
    }

    const visitCall = (node: SyntaxNode, scope: Scope) => {
        const callee = node.firstChild
        const list = node.getChild('ArgList')

        if (callee?.name !== 'MemberExpression') {
            const medium = callee ? visit(callee, scope) : undefined
            visitArguments(list, scope, undefined)
            return medium
        }

        const { receiverMedium, medium, name } = visitMember(callee, scope)
        visitArguments(list, scope, receiverMedium)

        if (name === trackMethod) {
            recordTrack(list, receiverMedium)
        }

        return medium
    }

    const visitDeclaration = (node: SyntaxNode, scope: Scope) => {
        for (const definition of node.getChildren('VariableDefinition')) {
            const equals = definition.nextSibling
            const value = equals?.name === 'Equals' ? equals.nextSibling : null
            const medium = value ? visit(value, scope) : undefined
            scope.names.set(readText(definition), medium)
            mark(definition, medium)
        }
    }

    const visitLabel = (node: SyntaxNode, scope: Scope) => {
        const label = node.getChild('Label')
        const body = node.lastChild
        const medium = body && body !== label ? visit(body, scope) : undefined

        if (!label) {
            return
        }

        const name = getBlockName(readText(label))

        if (isName(name)) {
            globals.set(name, medium)
        }

        mark(label, medium)
        blocks.push({ from: node.from, to: node.to, medium })
    }

    const visit = (node: SyntaxNode, scope: Scope): Medium | undefined => {
        switch (node.name) {
            case 'VariableName': {
                const medium = readName(node, scope)
                mark(node, medium)
                return medium
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
                return visitMember(node, scope).medium
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

const cache = new WeakMap<Tree, Mediums>()

export const readMediums = (state: EditorState) => {
    const tree = syntaxTree(state)
    const cached = cache.get(tree)

    if (cached) {
        return cached
    }

    const mediums = analyse(state)
    cache.set(tree, mediums)
    return mediums
}
