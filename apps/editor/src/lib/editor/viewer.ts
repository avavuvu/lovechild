import { javascript } from '@codemirror/lang-javascript'
import { bracketMatching } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { drawSelection, EditorView, highlightSpecialChars, lineNumbers } from '@codemirror/view'
import { bracketColors } from './brackets'
import { createKeyHandler } from './keys'
import { theme } from './theme'

export interface ViewerOptions {
    parent: HTMLElement
    onEvaluate: () => void
    onStop: () => void
}

export interface Viewer {
    show: (code: string) => void
    destroy: () => void
}

export const createViewer = ({ parent, onEvaluate, onStop }: ViewerOptions): Viewer => {
    const view = new EditorView({
        parent,
        state: EditorState.create({
            extensions: [
                lineNumbers(),
                highlightSpecialChars(),
                drawSelection({ cursorBlinkRate: 0 }),
                EditorState.readOnly.of(true),
                EditorView.domEventHandlers({ keydown: createKeyHandler(onEvaluate, onStop) }),
                javascript(),
                bracketColors,
                bracketMatching(),
                theme,
            ],
        }),
    })

    return {
        show: (code) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } }),
        destroy: () => view.destroy(),
    }
}
