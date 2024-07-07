import { App, Modal, Notice, PluginSettingTab, Setting, setTooltip } from "obsidian";
import NoteDefinition from "./main";

export enum PopoverEventSettings {
	Hover = "hover",
	Click = "click"
}

export enum PopoverDismissType {
	Click = "click",
	MouseExit = "mouse_exit"
}

export interface DividerSettings {
	dash: boolean;
	underscore: boolean;
}

export interface DefFileParseConfig {
	divider: DividerSettings;
}

export interface DefinitionPopoverConfig {
	displayAliases: boolean;
	displayDefFileName: boolean;
	enableCustomSize: boolean;
	maxWidth: number;
	maxHeight: number;
	popoverDismissEvent: PopoverDismissType;
}

export interface Settings {
	enableInReadingView: boolean;
	defFolder: string;
	popoverEvent: PopoverEventSettings;
	defFileParseConfig: DefFileParseConfig;
	defPopoverConfig: DefinitionPopoverConfig;
}

export const DEFAULT_DEF_FOLDER = "definitions"

export const DEFAULT_SETTINGS: Partial<Settings> = {
	enableInReadingView: true,
	popoverEvent: PopoverEventSettings.Hover,
	defFileParseConfig: {
		divider: {
			dash: true,
			underscore: false
		}
	},
	defPopoverConfig: {
		displayAliases: true,
		displayDefFileName: false,
		enableCustomSize: false,
		maxWidth: 150,
		maxHeight: 150,
		popoverDismissEvent: PopoverDismissType.Click,
	}
}

export class SettingsTab extends PluginSettingTab {
	plugin: NoteDefinition;
	settings: Settings;

	constructor(app: App, plugin: NoteDefinition) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = window.NoteDefinition.settings;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Enable in Reading View")
			.setDesc("Allow defined phrases and definition popovers to be shown in Reading View")
			.addToggle((component) => {
				component.setValue(this.settings.enableInReadingView);
				component.onChange(async (val) => {
					this.settings.enableInReadingView = val;
					await this.plugin.saveSettings();
				});
			});
		new Setting(containerEl)
			.setName("Definitions folder")
			.setDesc("Files within this folder will be parsed to register definitions")
			.addText((component) => {
				component.setValue(this.settings.defFolder);
				component.setPlaceholder(DEFAULT_DEF_FOLDER);
				component.setDisabled(true)
				setTooltip(component.inputEl, 
					"In the file explorer, right-click on the desired folder and click on 'Set definition folder' to change the definition folder",
				{
					delay: 100
				});
			});
		new Setting(containerEl)
			.setName("Definition file format settings")
			.setDesc("Customise parsing rules for definition files")
			.addExtraButton(component => {
				component.onClick(() => {
					const modal = new Modal(this.app);
					modal.setTitle("Definition file format settings")
					new Setting(modal.contentEl)
						.setName("Divider")
						.setHeading()
					new Setting(modal.contentEl)
						.setName("Dash")
						.setDesc("Use triple dash (---) as divider")
						.addToggle((component) => {
							component.setValue(this.settings.defFileParseConfig.divider.dash);
							component.onChange(async value => {
								if (!value && !this.settings.defFileParseConfig.divider.underscore) {
									new Notice("At least one divider must be chosen", 2000);
									component.setValue(this.settings.defFileParseConfig.divider.dash);
									return;
								}
								this.settings.defFileParseConfig.divider.dash = value;
								await this.plugin.saveSettings();
							});
						});
					new Setting(modal.contentEl)
						.setName("Underscore")
						.setDesc("Use triple underscore (___) as divider")
						.addToggle((component) => {
							component.setValue(this.settings.defFileParseConfig.divider.underscore);
							component.onChange(async value => {
								if (!value && !this.settings.defFileParseConfig.divider.dash) {
									new Notice("At least one divider must be chosen", 2000);
									component.setValue(this.settings.defFileParseConfig.divider.underscore);
									return;
								}
								this.settings.defFileParseConfig.divider.underscore = value;
								await this.plugin.saveSettings();
							});
						});
					modal.open();
				})
			});

		new Setting(containerEl)
			.setHeading()
			.setName("Definition Popover Settings");

		new Setting(containerEl)
			.setName("Definition popover display event")
			.setDesc("Choose the trigger event for displaying the definition popover")
			.addDropdown((component) => {
				component.addOption(PopoverEventSettings.Hover, "Hover");
				component.addOption(PopoverEventSettings.Click, "Click");
				component.setValue(this.settings.popoverEvent);
				component.onChange(async value => {
					if (value === PopoverEventSettings.Hover || value === PopoverEventSettings.Click) {
						this.settings.popoverEvent = value;
					}
					if (this.settings.popoverEvent === PopoverEventSettings.Click) {
						this.settings.defPopoverConfig.popoverDismissEvent = PopoverDismissType.Click;
					}
					await this.plugin.saveSettings();
					this.display();
				});
			});

		if (this.settings.popoverEvent === PopoverEventSettings.Hover) {
			new Setting(containerEl)
				.setName("Definition popover dismiss event")
				.setDesc("Configure the manner in which you would like to close/dismiss the definition popover.")
				.addDropdown(component => {
					component.addOption(PopoverDismissType.Click, "Click");
					component.addOption(PopoverDismissType.MouseExit, "Mouse exit")
					if (!this.settings.defPopoverConfig.popoverDismissEvent) {
						this.settings.defPopoverConfig.popoverDismissEvent = PopoverDismissType.Click;
						this.plugin.saveSettings();
					}
					component.setValue(this.settings.defPopoverConfig.popoverDismissEvent);
					component.onChange(async value => {
						if (value === PopoverDismissType.MouseExit || value === PopoverDismissType.Click) {
							this.settings.defPopoverConfig.popoverDismissEvent = value;
						}
						await this.plugin.saveSettings();
					});
				});
		}

		new Setting(containerEl)
			.setName("Display aliases")
			.setDesc("Display the list of aliases configured for the definition")
			.addToggle(component => {
				component.setValue(this.settings.defPopoverConfig.displayAliases);
				component.onChange(async value => {
					this.settings.defPopoverConfig.displayAliases = value;
					await this.plugin.saveSettings();
				});
			});
		

		new Setting(containerEl)
			.setName("Display definition source file")
			.setDesc("Display the title of the definition's source file")
			.addToggle(component => {
				component.setValue(this.settings.defPopoverConfig.displayDefFileName);
				component.onChange(async value => {
					this.settings.defPopoverConfig.displayDefFileName = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Custom popover size")
			.setDesc("Customise the maximum popover size. This is not recommended as it prevents dynamic sizing of the popover based on your viewport.")
			.addToggle(component => {
				component.setValue(this.settings.defPopoverConfig.enableCustomSize);
				component.onChange(async value => {
					this.settings.defPopoverConfig.enableCustomSize = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});

		if (this.settings.defPopoverConfig.enableCustomSize) {
			new Setting(containerEl)
				.setName("Popover width (px)")
				.setDesc("Maximum width of the definition popover")
				.addSlider(component => {
					component.setLimits(150, window.innerWidth, 1);
					component.setValue(this.settings.defPopoverConfig.maxWidth);
					component.setDynamicTooltip()
					component.onChange(async val => {
						this.settings.defPopoverConfig.maxWidth = val;
						await this.plugin.saveSettings();
					});
				});

			new Setting(containerEl)
				.setName("Popover height (px)")
				.setDesc("Maximum height of the definition popover")
				.addSlider(component => {
					component.setLimits(150, window.innerHeight, 1);
					component.setValue(this.settings.defPopoverConfig.maxHeight);
					component.setDynamicTooltip();
					component.onChange(async val => {
						this.settings.defPopoverConfig.maxHeight = val;
						await this.plugin.saveSettings();
					});
				});
		}
	}
}

export function getSettings(): Settings {
	return window.NoteDefinition.settings;
}
