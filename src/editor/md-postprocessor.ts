import { MarkdownPostProcessor } from "obsidian";
import { LineScanner, PhraseInfo } from "./definition-search";

interface Marks {
	el: HTMLElement;
	phraseInfo: PhraseInfo;
}

export const postProcessor: MarkdownPostProcessor = (element, context) => {
	const shouldRunPostProcessor = window.NoteDefinition.settings.enableInReadingView;
	if (!shouldRunPostProcessor) {
		return;
	}

	// Prevent post-processing for definition popover
	if (element.getAttr("ctx") === "def-popup") {
		return;
	}

	rebuildHTML(element);
}

const rebuildHTML = (parent: Node) => {
	for (let i = 0; i < parent.childNodes.length; i++) {
		const childNode = parent.childNodes[i];
		// Replace only if TEXT_NODE
		if (childNode.nodeType === Node.TEXT_NODE && childNode.textContent) {
			if (childNode.textContent === "\n") {
				// Ignore nodes with just a newline char
				continue;
			}
			const lineScanner = new LineScanner();
			const currText = childNode.textContent;
			const phraseInfos = lineScanner.scanLine(currText);
			if (phraseInfos.length === 0) {
				continue;
			}

			phraseInfos.sort((a, b) => a.from - b.from);
			let currCursor = 0;
			const newContainer = parent.createSpan();
			const addedMarks: Marks[] = [];

			phraseInfos.forEach(phraseInfo => {
				if (phraseInfo.from < currCursor) {
					// Subset or intersect phrases are ignored
					return;
				}

				newContainer.appendText(currText.slice(currCursor, phraseInfo.from));
				const span = newContainer.createSpan({
					cls: "def-decoration",
					attr: {
						def: phraseInfo.phrase,
						onmouseenter: "window.NoteDefinition.triggerDefPreview(this)"
					},
					text: currText.slice(phraseInfo.from, phraseInfo.to),
				});
				newContainer.appendChild(span);
				addedMarks.push({
					el: span,
					phraseInfo: phraseInfo,
				})
				currCursor = phraseInfo.to;
			});
			newContainer.appendText(currText.slice(currCursor));
			childNode.replaceWith(newContainer);
		}

		rebuildHTML(childNode);
	}
}
