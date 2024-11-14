import { App, getFrontMatterInfo, TFile } from "obsidian";
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

	private parseFrontMatterFromPlaintext(content: string): Map<string, string> {
		const fm = getFrontMatterInfo(content).frontmatter;
		const fmStrings = fm.trim().split("\n");

		let frontmatter = new Map<string, string>();
		for (const fmString of fmStrings) {
			const split = fmString.split(":");
			const keyfm = split[0];
			const value = split[1].trim();
			frontmatter.set(keyfm, value);
		}

		return frontmatter;
	}

	private async getDefFileType(): Promise<DefFileType> {
		const fileCache = this.app.metadataCache.getFileCache(this.file);
		let fmFileType = fileCache?.frontmatter?.[DEF_TYPE_FM];
		if(!fmFileType) {
			// File not in cache, so we have to read the file contents
			// to determine the file type
			const content = await this.app.vault.cachedRead(this.file);
			const frontmatter = this.parseFrontMatterFromPlaintext(content);
			fmFileType = frontmatter.get(DEF_TYPE_FM) as DefFileType;
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
