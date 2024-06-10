import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginSpec,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { logDebug } from "src/util/log";
import { LineScanner } from "./definition-search";

// Information of phrase that can be used to add decorations within the editor
interface PhraseInfo {
	from: number;
	to: number;
	phrase: string;
}

// View plugin to mark definitions
export class DefinitionMarker implements PluginValue {
	readonly cnLangRegex = /\p{Script=Han}/u;
	readonly terminatingCharRegex = /[!@#$%^&*()\+={}[\]:;"'<>,.?\/|\\\r\n ]/;

	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			const start = performance.now();
			this.decorations = this.buildDecorations(update.view);
			const end = performance.now();
			logDebug(`Marked definitions in ${end-start}ms`)
			return
		}
	}

	destroy() {}

	buildDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const phraseInfos: PhraseInfo[] = [];

		for (let { from, to } of view.visibleRanges) {
			const text = view.state.sliceDoc(from, to);
			phraseInfos.push(...this.scanText(text, from));
		}

		phraseInfos.forEach(wordPos => {
			builder.add(wordPos.from, wordPos.to, Decoration.mark({
				class: 'def-decoration',
				attributes: {
					onmouseenter: `window.NoteDefinition.triggerDefPreview(this)`,
					def: wordPos.phrase
				}
			}));
		});
		return builder.finish();
	}

	// Scan text and return phrases and their positions that require decoration
	private scanText(text: string, offset: number): PhraseInfo[] {
		let phraseInfos: PhraseInfo[] = [];
		const lines = text.split('\n');
		let internalOffset = offset;
		const lineScanner = new LineScanner();

		lines.forEach(line => {
			phraseInfos.push(...lineScanner.scanLine(line, internalOffset));
			// Additional 1 char for \n char
			internalOffset += line.length + 1;
		});

		// Decorations need to be sorted by 'from'
		phraseInfos.sort((a, b) => a.from - b.from);
		return this.removeSubsetsAndIntersects(phraseInfos)
	}

	private removeSubsetsAndIntersects(phraseInfos: PhraseInfo[]): PhraseInfo[] {
		let cursor = 0;
		return phraseInfos.filter(phraseInfo => {
			if (phraseInfo.from > cursor) {
				cursor = phraseInfo.to;
				return true;
			}
			return false;
		});
	}
}

const pluginSpec: PluginSpec<DefinitionMarker> = {
	decorations: (value: DefinitionMarker) => value.decorations,
};

export const definitionMarker = ViewPlugin.fromClass(
	DefinitionMarker,
	pluginSpec
);

