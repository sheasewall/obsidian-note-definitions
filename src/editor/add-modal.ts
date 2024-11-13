import { App, ButtonComponent, DropdownComponent, Modal, Notice, Setting } from "obsidian";
import { getDefFileManager } from "src/core/def-file-manager";
import { DefFileUpdater } from "src/core/def-file-updater";
import { DefFileType } from "src/core/file-parser";

export class AddDefinitionModal {
	app: App;
	modal: Modal;
	aliases: string;
	definition: string;
	submitting: boolean;

	fileTypePicker: DropdownComponent;
	defFilePickerSetting: Setting;
	defFilePicker: DropdownComponent;

	atomicFolderPickerSetting: Setting;
	atomicFolderPicker: DropdownComponent;

	newFileButton: ButtonComponent;
	newFolderButton: ButtonComponent;

	constructor(app: App) {
		this.app = app;
		this.modal = new Modal(app);
	}

	open(text?: string) {
		this.submitting = false;
		this.modal.setTitle("Add Definition");
		this.modal.contentEl.createDiv({
			cls: "edit-modal-section-header",
			text: "Word/Phrase"
		})
		const phraseText = this.modal.contentEl.createEl("textarea", {
			cls: 'edit-modal-aliases',
			attr: {
				placeholder: "Word/phrase to be defined"
			},
			text: text ?? ''
		});
		this.modal.contentEl.createDiv({
			cls: "edit-modal-section-header",
			text: "Aliases"
		})
		const aliasText = this.modal.contentEl.createEl("textarea", {
			cls: 'edit-modal-aliases',
			attr: {
				placeholder: "Add comma-separated aliases here"
			},
		});
		this.modal.contentEl.createDiv({
			cls: "edit-modal-section-header",
			text: "Definition"
		});
		const defText = this.modal.contentEl.createEl("textarea", {
			cls: 'edit-modal-textarea',
			attr: {
				placeholder: "Add definition here"
			},
		});

		new Setting(this.modal.contentEl)
			.setName("Definition file type")
			.addDropdown(component => {
				component.addOption(DefFileType.Consolidated, "Consolidated");
				component.addOption(DefFileType.Atomic, "Atomic");
				component.onChange(val => {
					if (val === DefFileType.Consolidated) {
						this.atomicFolderPickerSetting.settingEl.hide();
						this.defFilePickerSetting.settingEl.show();

						this.newFolderButton.buttonEl.hide();
						this.newFileButton.buttonEl.show();
					} else if (val === DefFileType.Atomic) {
						this.defFilePickerSetting.settingEl.hide();
						this.atomicFolderPickerSetting.settingEl.show();

						this.newFileButton.buttonEl.hide();
						this.newFolderButton.buttonEl.show();
					}
				});
				this.fileTypePicker = component;
			});

		const defManager = getDefFileManager();
		this.defFilePickerSetting = new Setting(this.modal.contentEl)
			.setName("Definition file")
			.addDropdown(component => {
				const defFiles = defManager.getConsolidatedDefFiles();
				defFiles.forEach(file => {
					component.addOption(file.path, file.path);
				});
				this.defFilePicker = component;
			});

		this.atomicFolderPickerSetting = new Setting(this.modal.contentEl)
			.setName("Add file to folder")
			.addDropdown(component => {
				const defFolders = defManager.getDefFolders();
				defFolders.forEach(folder => {
					component.addOption(folder.path, folder.path + "/");
				});
				this.atomicFolderPicker = component;
			});
		this.atomicFolderPickerSetting.settingEl.hide();

		this.newFolderButton = new ButtonComponent(this.modal.contentEl)
			.setClass('add-modal-new-button')
			.setButtonText("New Folder")
			.onClick(() => {
				const newFolderPath = defManager.ensureGlobalDefFolder();
				if (!newFolderPath) {
					new Notice("Folder already exists");
					return;
				};
				this.atomicFolderPicker.addOption(newFolderPath, newFolderPath + "/");
			});
		this.newFolderButton.buttonEl.hide();

		this.newFileButton = new ButtonComponent(this.modal.contentEl)
			.setClass('add-modal-new-button')
			.setButtonText("New File")
			.onClick(() => {
				const newFilePath = defManager.createConsolidatedFile();
				this.defFilePicker.addOption(newFilePath, newFilePath);
				this.defFilePicker.setValue(newFilePath);
			});

		const saveButton = this.modal.contentEl.createEl("button", {
			text: "Save",
			cls: 'edit-modal-save-button',
		});

		saveButton.addEventListener('click', () => {
			if (this.submitting) {
				return;
			}
			if (!phraseText.value || !defText.value) {
				new Notice("Please fill in a definition value");
				return;
			}
			const fileType = this.fileTypePicker.getValue();
			if (fileType === DefFileType.Consolidated && !this.defFilePicker.getValue()) {
				new Notice("Please choose a definition file. If you do not have any definition files, please create one.")
				return;
			}
			if (fileType === DefFileType.Atomic && !this.atomicFolderPicker.getValue()) {
				new Notice("Please choose a definition folder. If you do not have any definition folders, please create one")
				return;
			}

			const defFileManager = getDefFileManager();
			const definitionFile = defFileManager.globalDefFiles.get(this.defFilePicker.getValue());
			const updated = new DefFileUpdater(this.app);
			updated.addDefinition({
				fileType: fileType as DefFileType,
				key: phraseText.value.toLowerCase(),
				word: phraseText.value,
				aliases: aliasText.value ? aliasText.value.split(",").map(alias => alias.trim()) : [],
				definition: defText.value,
				file: definitionFile,
			}, this.atomicFolderPicker.getValue());
			this.modal.close();
		});

		this.modal.open();
	}
}
