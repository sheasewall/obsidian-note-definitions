import { Platform } from "obsidian";
import { getSettings, PopoverEventSettings } from "src/settings";

const triggerFunc = 'event.stopPropagation();activeWindow.NoteDefinition.triggerDefPreview(this);';

export const DEF_DECORATION_CLS = "def-decoration";

// For normal decoration of definitions
export function getDecorationAttrs(phrase: string): { [key: string]: string } {
	let attributes: { [key: string]: string } = {
		def: phrase,
	}
	const settings = getSettings();
	if (Platform.isMobile) {
		attributes.onclick = triggerFunc;
		return attributes;
	}
	if (settings.popoverEvent === PopoverEventSettings.Click) {
		attributes.onclick = triggerFunc;
	} else {
		attributes.onmouseenter = triggerFunc;
	}
	attributes.style =
		'--custom-underline-color:' + settings.defDecorationConfig.underlineColour + ';' +
		'--custom-underline-style:' + settings.defDecorationConfig.underlineStyle + ';';
	return attributes;
}

export function getLinkDecorationAttrs() {
	let attributes: { [key: string]: string } = { };
	const settings = getSettings();
	attributes.style =
		'--custom-underline-color:' + settings.linkDecorationConfig.underlineColour + ';' +
		'--custom-underline-style:' + settings.linkDecorationConfig.underlineStyle + ';';
	return attributes;
}