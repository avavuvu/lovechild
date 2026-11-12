import { createRequire } from 'node:module'
import { join } from 'node:path'
import ts from 'typescript'

const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
}

const findCoreEntry = () => createRequire(join(process.cwd(), 'package.json')).resolve('@lovechild/core')

const createChecker = () => {
    const entry = findCoreEntry()
    const program = ts.createProgram([entry], options)
    const checker = program.getTypeChecker()
    const source = program.getSourceFile(entry)
    const entrySymbol = source && checker.getSymbolAtLocation(source)

    if (!entrySymbol) {
        throw new Error('@lovechild/core could not be read for parameter types')
    }

    return { checker, exports: checker.getExportsOfModule(entrySymbol) }
}

const { checker, exports } = createChecker()

const resolveAlias = (symbol: ts.Symbol) => symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol

const findMemberType = (symbol: ts.Symbol) => symbol.flags & ts.SymbolFlags.Class ? checker.getDeclaredTypeOfSymbol(symbol) : checker.getTypeOfSymbol(symbol)

const findAliasDeclaration = (node: ts.TypeReferenceNode) => {
    const symbol = checker.getSymbolAtLocation(node.typeName)
    return symbol && resolveAlias(symbol).declarations?.find(ts.isTypeAliasDeclaration)
}

const expandType = (node: ts.TypeNode): ReadonlyArray<string> => {
    if (ts.isUnionTypeNode(node)) {
        return node.types.flatMap(expandType)
    }

    const alias = ts.isTypeReferenceNode(node) ? findAliasDeclaration(node) : undefined
    return alias ? expandType(alias.type) : [node.getText()]
}

const readTypes = (parameter: ts.Symbol) => {
    const declaration = parameter.valueDeclaration

    if (declaration && ts.isParameter(declaration) && declaration.type) {
        return Array.from(new Set(expandType(declaration.type)))
    }

    return [checker.typeToString(checker.getTypeOfSymbol(parameter))]
}

export const readParameterTypes = (path: ReadonlyArray<string>): ReadonlyMap<string, ReadonlyArray<string>> => {
    const [first, ...rest] = path
    const start = exports.find((symbol) => symbol.name === first)
    const symbol = rest.reduce<ts.Symbol | undefined>((current, name) => current && findMemberType(current).getProperty(name), start && resolveAlias(start))
    const signature = symbol && checker.getTypeOfSymbol(symbol).getCallSignatures()[0]

    return new Map(signature?.parameters.map((parameter) => [parameter.name, readTypes(parameter)]) ?? [])
}
