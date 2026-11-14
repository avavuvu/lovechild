import ts from 'typescript'
import type { EntryParameter } from '../docs/reference'
import { checker, expandType, program, strudelFolder } from './types'

export interface Extension {
    name: string
    synonyms: ReadonlyArray<string>
    owners: ReadonlyArray<string>
    parameters: ReadonlyArray<EntryParameter>
    returns: ReadonlyArray<string>
}

type FunctionNode = ts.ArrowFunction | ts.FunctionExpression

interface Found {
    names: ReadonlyArray<string>
    owners: ReadonlyArray<string>
    callable: FunctionNode
    isReceiverLast: boolean
    isShared: boolean
}

const isFunctionNode = (node: ts.Node): node is FunctionNode => ts.isArrowFunction(node) || ts.isFunctionExpression(node)

const findDeclaration = (node: ts.Identifier) => checker.getSymbolAtLocation(node)?.valueDeclaration

const findLoopValues = (node: ts.Identifier) => {
    const declaration = findDeclaration(node)
    const loop = declaration && ts.isVariableDeclaration(declaration) ? declaration.parent.parent : undefined
    return loop && ts.isForOfStatement(loop) ? loop.expression : undefined
}

const readArray = (node: ts.Expression): ReadonlyArray<ts.Expression> => {
    if (ts.isArrayLiteralExpression(node)) {
        return node.elements
    }

    const declaration = ts.isIdentifier(node) ? findDeclaration(node) : undefined
    return declaration && ts.isVariableDeclaration(declaration) && declaration.initializer ? readArray(declaration.initializer) : []
}

const readNames = (node: ts.Expression): ReadonlyArray<string> => {
    if (ts.isStringLiteral(node)) {
        return [node.text]
    }

    const values = ts.isIdentifier(node) ? findLoopValues(node) : undefined
    return values ? readArray(values).flatMap(readNames) : []
}

const readOwners = (node: ts.Expression): ReadonlyArray<string> => {
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'prototype') {
        return [node.expression.getText()]
    }

    const values = ts.isIdentifier(node) ? findLoopValues(node) : undefined
    return values ? readArray(values).flatMap(readOwners) : []
}

const readCallable = (node: ts.Expression | undefined): FunctionNode | undefined => {
    if (!node) {
        return undefined
    }

    if (isFunctionNode(node)) {
        return node
    }

    const declaration = ts.isIdentifier(node) ? findDeclaration(node) : undefined
    return declaration && ts.isVariableDeclaration(declaration) ? readCallable(declaration.initializer) : undefined
}

const readDescriptorValue = (node: ts.Expression) => {
    if (!ts.isObjectLiteralExpression(node)) {
        return undefined
    }

    const property = node.properties.find((found) => ts.isPropertyAssignment(found) && found.name.getText() === 'value')
    return property && ts.isPropertyAssignment(property) ? property.initializer : undefined
}

const isCallTo = (node: ts.CallExpression, name: string) => node.expression.getText() === name

const readRegistration = (node: ts.CallExpression): Found | undefined => {
    const [name, value] = node.arguments
    const callable = readCallable(value)
    const names = name ? readNames(name) : []
    return callable && names.length > 0 ? { names, owners: ['Pattern'], callable, isReceiverLast: true, isShared: true } : undefined
}

const readDefinition = (node: ts.CallExpression): Found | undefined => {
    const [target, name, descriptor] = node.arguments
    const value = descriptor ? readDescriptorValue(descriptor) : undefined
    const callable = readCallable(value)
    const names = name ? readNames(name) : []
    const owners = target ? readOwners(target) : []
    const isShared = value !== undefined && !isFunctionNode(value)
    return callable && names.length > 0 && owners.length > 0 ? { names, owners, callable, isReceiverLast: false, isShared } : undefined
}

const findExtensions = (source: ts.SourceFile) => {
    const found: Array<Found> = []

    const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
            const extension = isCallTo(node, 'register') ? readRegistration(node) : isCallTo(node, 'Object.defineProperty') ? readDefinition(node) : undefined

            if (extension) {
                found.push(extension)
            }
        }

        ts.forEachChild(node, visit)
    }

    visit(source)
    return found
}

const readTypeNames = (type: ts.Type): ReadonlyArray<string> => {
    const members = type.isUnion() ? type.types : [type]
    return Array.from(new Set(members.map((member) => checker.typeToString(member).replace(/<.*>$/, ''))))
}

const readParameter = (node: ts.ParameterDeclaration): EntryParameter => ({
    name: node.name.getText(),
    types: node.type ? Array.from(new Set(expandType(node.type))) : readTypeNames(checker.getTypeAtLocation(node)),
    default: node.initializer?.getText(),
})

const separateNames = (found: Found): ReadonlyArray<Found> => found.isShared ? [found] : found.names.map((name) => ({ ...found, names: [name] }))

const createExtension = ({ names, owners, callable, isReceiverLast }: Found): Extension => {
    const declared = callable.parameters.filter((parameter) => parameter.name.getText() !== 'this')
    const parameters = isReceiverLast ? declared.slice(0, -1) : declared
    const signature = checker.getSignatureFromDeclaration(callable)
    const [name, ...synonyms] = names

    return {
        name,
        synonyms,
        owners,
        parameters: parameters.map(readParameter),
        returns: signature ? readTypeNames(signature.getReturnType()) : [],
    }
}

export const readExtensions = (): ReadonlyArray<Extension> => {
    const sources = program.getSourceFiles().filter((source) => source.fileName.startsWith(strudelFolder) && !source.isDeclarationFile)
    const extensions = sources.flatMap(findExtensions).flatMap(separateNames).map(createExtension)
    const names = Array.from(new Set(extensions.map((extension) => extension.name)))

    return names.map((name) => {
        const [first, ...rest] = extensions.filter((extension) => extension.name === name)

        return {
            ...first,
            owners: Array.from(new Set([first, ...rest].flatMap((extension) => extension.owners))),
            returns: Array.from(new Set([first, ...rest].flatMap((extension) => extension.returns))),
        }
    })
}
