import { App, TFile } from "obsidian";
import { getSettings } from "src/settings";
import { AtomicDefParser } from "./atomic-def-parser";
import { ConsolidatedDefParser } from "./consolidated-def-parser";
import { Definition } from "./model";

export const DEF_TYPE_FM = "def-type";

export enum DefFileType {
	Consolidated = "consolidated",
	Atomic = "atomic"
}

export class FileParser {
	app: App;
	file: TFile
	defFileType?: DefFileType;

	constructor(app: App, file: TFile) {
		this.app = app;
		this.file = file;
	}

	// Optional argument used when file cache may not be updated
	// and we know the new contents of the file
	async parseFile(fileContent?: string): Promise<Definition[]> {
		this.defFileType = await this.getDefFileType();

		switch (this.defFileType) {
			case DefFileType.Consolidated:
				const defParser = new ConsolidatedDefParser(this.app, this.file);
				return defParser.parseFile(fileContent);
			case DefFileType.Atomic:
				const atomicParser = new AtomicDefParser(this.app, this.file);
				return atomicParser.parseFile(fileContent);
		}
	}

	private async getDefFileType(): Promise<DefFileType> {
		const fileCache = this.app.metadataCache.getFileCache(this.file);
		let fmFileType = fileCache?.frontmatter?.[DEF_TYPE_FM];
		if(!fmFileType) {
			const content = await this.app.vault.read(this.file);
			if (content.startsWith('---\ndef-type: ' + DefFileType.Atomic)) {
				fmFileType = DefFileType.Atomic;
			};
			if (content.startsWith('---\ndef-type: ' + DefFileType.Consolidated)) {
				fmFileType = DefFileType.Consolidated;
			};
		}
		
		if (fmFileType && 
			(fmFileType === DefFileType.Consolidated || fmFileType === DefFileType.Atomic)) {
			return fmFileType;
		}
		
		// Fallback to configured default
		const parserSettings = getSettings().defFileParseConfig;

		if (parserSettings.defaultFileType) {
			return parserSettings.defaultFileType;
		}
		return DefFileType.Consolidated;
	}
}
