import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
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

const resolvePackage = (name: string) => createRequire(join(process.cwd(), 'package.json')).resolve(name)

const listFolder = (entry: string) => readdirSync(dirname(entry))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => join(dirname(entry), file))

export const strudelFolder = dirname(resolvePackage('@lovechild/strudel'))

const createChecker = () => {
    const entry = resolvePackage('@lovechild/core')
    const program = ts.createProgram([entry, ...listFolder(resolvePackage('@lovechild/strudel'))], options)
    const checker = program.getTypeChecker()
    const source = program.getSourceFile(entry)
    const entrySymbol = source && checker.getSymbolAtLocation(source)

    if (!entrySymbol) {
        throw new Error('@lovechild/core could not be read for parameter types')
    }

    return { program, checker, exports: checker.getExportsOfModule(entrySymbol) }
}

export const { program, checker, exports } = createChecker()

const resolveAlias = (symbol: ts.Symbol) => symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol

const findMemberType = (symbol: ts.Symbol) => symbol.flags & ts.SymbolFlags.Class ? checker.getDeclaredTypeOfSymbol(symbol) : checker.getTypeOfSymbol(symbol)

const findAliasDeclaration = (node: ts.TypeReferenceNode) => {
    const symbol = checker.getSymbolAtLocation(node.typeName)
    return symbol && resolveAlias(symbol).declarations?.find(ts.isTypeAliasDeclaration)
}

export const expandType = (node: ts.TypeNode): ReadonlyArray<string> => {
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

const readReturnTypes = (signature: ts.Signature, owner: string | undefined): ReadonlyArray<string> => {
    const declaration = signature.getDeclaration()
    const written = declaration && 'type' in declaration && declaration.type && ts.isTypeNode(declaration.type) ? expandType(declaration.type) : [checker.typeToString(signature.getReturnType())]
    return Array.from(new Set(written.map((type) => type === 'this' && owner ? owner : type)))
}

export const readSignatureTypes = (path: ReadonlyArray<string>) => {
    const [first, ...rest] = path
    const start = exports.find((symbol) => symbol.name === first)
    const symbol = rest.reduce<ts.Symbol | undefined>((current, name) => current && findMemberType(current).getProperty(name), start && resolveAlias(start))
    const signature = symbol && checker.getTypeOfSymbol(symbol).getCallSignatures()[0]
    const owner = rest.length > 0 ? first : undefined

    return {
        parameters: new Map(signature?.parameters.map((parameter) => [parameter.name, readTypes(parameter)]) ?? []),
        returns: signature ? readReturnTypes(signature, owner) : [],
    }
}
