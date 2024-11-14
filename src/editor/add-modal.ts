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
	newFileButton: ButtonComponent;

	atomicFolderPickerSetting: Setting;
	atomicFolderPicker: DropdownComponent;
	newFolderButton: ButtonComponent

	private static lastSelectedConsolidatedFile: string;

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
				component.onChange(val => this.switchMenu(val));
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
				if (defFiles.find(file => file.path === AddDefinitionModal.lastSelectedConsolidatedFile)) {
					component.setValue(AddDefinitionModal.lastSelectedConsolidatedFile);
				}
				component.onChange(val => {
					AddDefinitionModal.lastSelectedConsolidatedFile = val;
				});
				this.defFilePicker = component;
			});

		this.newFileButton = new ButtonComponent(this.modal.contentEl)
			.setClass('add-modal-new-folder-button')
			.setButtonText("Create new consolidated file")
			.onClick(() => {
				const newFilePath = defManager.createConsolidatedFile();
				this.defFilePicker.addOption(newFilePath, newFilePath);
				this.defFilePicker.setValue(newFilePath);
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

		this.newFolderButton = new ButtonComponent(this.modal.contentEl)
			.setClass('add-modal-new-folder-button')
			.setButtonText("Create global folder")
			.onClick(() => {
				const globalFolderPath = defManager.ensureGlobalDefFolder();
				if (!globalFolderPath) {
					new Notice("Folder already exists");
					return;
				};
				this.atomicFolderPicker.addOption(globalFolderPath, globalFolderPath + "/");
			});

		this.switchMenu(window.NoteDefinition.settings.addModalDefaultFileType);
		
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
				new Notice("Please choose a definition file. If you do not have any definition files, please create one.");
				return;
			}
			if (fileType === DefFileType.Atomic && !this.atomicFolderPicker.getValue()) {
				new Notice("Please choose a folder to add the definition to. If you do not have any folders, please create one.");
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

	switchMenu(defFileType: string) {
		this.fileTypePicker.setValue(defFileType);
		if (defFileType === DefFileType.Consolidated) {
			this.newFolderButton.buttonEl.hide();
			this.atomicFolderPickerSetting.settingEl.hide();
			this.newFileButton.buttonEl.show();
			this.defFilePickerSetting.settingEl.show();
		} else if (defFileType === DefFileType.Atomic) {
			this.defFilePickerSetting.settingEl.hide();
			this.newFileButton.buttonEl.hide();
			this.atomicFolderPickerSetting.settingEl.show();
			this.newFolderButton.buttonEl.show();
		}
	}
}
