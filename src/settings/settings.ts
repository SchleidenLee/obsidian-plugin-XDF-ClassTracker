import OZCalendarPlugin from 'main';
import { PluginSettingTab, App, Setting } from 'obsidian';
import { FolderSuggest } from 'settings/suggestor';

export type OpenFileBehaviourType = 'new-tab' | 'new-tab-group' | 'current-tab' | 'obsidian-default';
export type SortingOption = 'name' | 'name-rev';
export type DateSourceOption = 'filename' | 'yaml';
export type NewNoteDateType = 'current-date' | 'active-date';
export type CalendarType = 'US' | 'ISO 8601';
export type OverflowBehaviour = 'scroll' | 'hide' | 'next-line';

export interface OZCalendarPluginSettings {
	openViewOnStart: boolean;
	calendarType: CalendarType;
	dateSource: DateSourceOption;
	yamlKey: string;
	dateFormat: string;
	defaultFolder: string;
	defaultFileNamePrefix: string;
	fixedCalendar: boolean;
	showDestinationFolderDuringCreate: boolean;
	allowSlashhDuringCreate: boolean;
	openFileBehaviour: OpenFileBehaviourType;
	sortingOption: SortingOption;
	newNoteDate: NewNoteDateType;
	newNoteCancelButtonReverse: boolean;
	fileNameOverflowBehaviour: OverflowBehaviour;
	showWeekNumbers: boolean;
	timeSlots: string[];
	slotPendingColor: string;
	slotDoneColor: string;
}

export const DEFAULT_SETTINGS: OZCalendarPluginSettings = {
	openViewOnStart: true,
	calendarType: 'ISO 8601',
	dateSource: 'yaml',
	yamlKey: 'created',
	dateFormat: 'YYYY-MM-DD hh:mm:ss',
	defaultFolder: '/',
	defaultFileNamePrefix: 'YYYY-MM-DD',
	fixedCalendar: true,
	showDestinationFolderDuringCreate: true,
	allowSlashhDuringCreate: false,
	openFileBehaviour: 'current-tab',
	sortingOption: 'name',
	newNoteDate: 'current-date',
	newNoteCancelButtonReverse: false,
	fileNameOverflowBehaviour: 'hide',
	showWeekNumbers: false,
	timeSlots: ['10:00', '12:20', '15:30', '17:50', '20:10'],
	slotPendingColor: '#c4a35a',
	slotDoneColor: '#7a9e7e',
};

export class OZCalendarPluginSettingsTab extends PluginSettingTab {
	plugin: OZCalendarPlugin;

	constructor(app: App, plugin: OZCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let { containerEl } = this;
		containerEl.empty();

		/* ------------- Buy Me a Coffee ------------- */

		const tipDiv = containerEl.createDiv('tip');
		tipDiv.addClass('oz-cal-tip-div');
		const tipLink = tipDiv.createEl('a', { href: 'https://revolut.me/ozante' });
		const tipImg = tipLink.createEl('img', {
			attr: {
				src: 'https://raw.githubusercontent.com/ozntel/file-tree-alternative/main/images/tip%20the%20artist_v2.png',
			},
		});
		tipImg.height = 55;

		const coffeeDiv = containerEl.createDiv('coffee');
		coffeeDiv.addClass('oz-cal-coffee-div');
		const coffeeLink = coffeeDiv.createEl('a', { href: 'https://ko-fi.com/L3L356V6Q' });
		const coffeeImg = coffeeLink.createEl('img', {
			attr: {
				src: 'https://cdn.ko-fi.com/cdn/kofi2.png?v=3',
			},
		});
		coffeeImg.height = 45;

		/* ------------- General Settings ------------- */

		containerEl.createEl('h1', { text: 'OZ Calendar Plugin Settings' });

		containerEl.createEl('h2', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Open Calendar on Start')
			.setDesc('Disable if you dont want Calendar View to be opened during the initial vault launch')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openViewOnStart).onChange((newValue) => {
					this.plugin.settings.openViewOnStart = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Calendar Type')
			.setDesc(
				`
                Select the calendar type to be displayed. While the week in the US type starts from Sunday,
                in the ISO 8601 type, the week starts from Monday`
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('ISO 8601', 'ISO 8601')
					.addOption('US', 'US')
					.setValue(this.plugin.settings.calendarType)
					.onChange((newValue: CalendarType) => {
						this.plugin.settings.calendarType = newValue;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});

		new Setting(containerEl)
			.setName('Show Week Numbers')
			.setDesc('Enable if you want to have week numbers within the calendar view')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showWeekNumbers).onChange((newValue) => {
					this.plugin.settings.showWeekNumbers = newValue;
					this.plugin.saveSettings();
					this.plugin.calendarForceUpdate();
				});
			});

		new Setting(containerEl)
			.setName('Open File Behaviour')
			.setDesc('Select the behaviour you want to have when you click on file name in the calendar view')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('obsidian-default', "Obsidian's Default")
					.addOption('new-tab', 'Open in a New Tab')
					.addOption('new-tab-group', 'Open in a New Tab Group')
					.addOption('current-tab', 'Open in the Active Tab')
					.setValue(this.plugin.settings.openFileBehaviour)
					.onChange((newValue: OpenFileBehaviourType) => {
						this.plugin.settings.openFileBehaviour = newValue;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('File List Sorting')
			.setDesc('Select the sorting behaviour in the file list')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('name', 'File Name (A to Z)')
					.addOption('name-rev', 'File Name (Z to A)')
					.setValue(this.plugin.settings.sortingOption)
					.onChange((newValue: SortingOption) => {
						this.plugin.settings.sortingOption = newValue;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});

		containerEl.createEl('h2', { text: 'YAML, File Name and Date Format Settings' });

		containerEl.createEl('p', {
			text: `
            When you make a change under this section for YAML Key and Date Format, make sure that
            you also use "Reload Plugin" button so that the changes can be activated.
            `,
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('Date Source')
			.setDesc(
				`Select the date source to be used in each folder. It can be either YAML Key or File Name.
                Depending on what you provide within the date format, it will try to parse the date source.`
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('filename', 'File Name')
					.addOption('yaml', 'YAML Key')
					.setValue(this.plugin.settings.dateSource)
					.onChange(async (newValue: DateSourceOption) => {
						this.plugin.settings.dateSource = newValue;
						this.plugin.saveSettings();
						this.plugin.OZCALENDARDAYS_STATE = await this.plugin.getNotesWithDates();
						this.plugin.calendarForceUpdate();
						// If YAML selected, show the YAML key below, or hide if changed back to filename
						let yamlKeySettingEl = document.querySelector('.oz-calendar-setting-yaml-key-value');
						if (yamlKeySettingEl) {
							if (newValue === 'filename') {
								yamlKeySettingEl.addClass('oz-calendar-custom-hidden');
							} else {
								yamlKeySettingEl.removeClass('oz-calendar-custom-hidden');
							}
						}
					});
			});

		let yamlKeySetting = new Setting(containerEl)
			.setClass('oz-calendar-setting-yaml-key-value')
			.setName('YAML Key')
			.setDesc('Set the YAML Key that should be used for displaying in the calendar')
			.addText((text) => {
				text.setValue(this.plugin.settings.yamlKey).onChange((newValue) => {
					this.plugin.settings.yamlKey = newValue;
					this.plugin.saveSettings();
				});
			});

		if (this.plugin.settings.dateSource === 'filename') yamlKeySetting.setClass('oz-calendar-custom-hidden');

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc(
				`Set the Date format you are using within the YAML key or File Name provided above. 
                If you are using File Name, make sure that you dont have any special characters since Obsidian doesnt
                support special characters in the file name like colon. Reload the plugin using the following button
                in case you change this value`
			)
			.addText((text) => {
				text.setValue(this.plugin.settings.dateFormat).onChange((newValue) => {
					this.plugin.settings.dateFormat = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Reload the plugin')
			.setDesc('Make sure that you reload the plugin if you changed YAML key or Date Format')
			.addButton((button) => {
				button.setButtonText('Reload Plugin');
				button.onClick(() => {
					this.plugin.reloadPlugin();
				});
			});

		containerEl.createEl('h2', { text: 'New Note Settings' });

		containerEl.createEl('p', {
			text: `
                The plugin will add the YAML key and date to the newly created note using the date format provided above 
                if Date Source is YAML. However, auto YAML key generation for the notes is going to be disabled if you use
                File Name as date source.
            `,
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('New Note Date')
			.setDesc(
				`
                Define the default behaviour for new note button if it should create under the active date or current date (today).
                This setting will drive the date for the YAML Key value and File Name.
                `
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('active-date', 'Active Date (Selected)')
					.addOption('current-date', 'Current Date (Today)')
					.setValue(this.plugin.settings.newNoteDate)
					.onChange((newValue: NewNoteDateType) => {
						this.plugin.settings.newNoteDate = newValue;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default Folder Location')
			.setDesc('Select the default folder, under which the new files should be saved when use plugin + icon')
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl);
				cb.setPlaceholder('Example: folder1/folder2')
					.setValue(this.plugin.settings.defaultFolder)
					.onChange((new_folder) => {
						this.plugin.settings.defaultFolder = new_folder;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default File Name Prefix Date Format')
			.setDesc(
				'Set the default file name prefix date format that will be used when you create a note using + icon. Leave blank if you dont want any'
			)
			.addText((text) => {
				text.setValue(this.plugin.settings.defaultFileNamePrefix).onChange((newValue) => {
					this.plugin.settings.defaultFileNamePrefix = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Show Destination Folder During File Creation')
			.setDesc(
				`
                Disable this if you dont want to see the destination folder selection during 
                the file creation process. The value is always going to be defaulted to the
                selected Default Folder above. You can change the destination folder for each
                folder separately but the default value will always stay same.
                `
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showDestinationFolderDuringCreate).onChange((newValue) => {
					this.plugin.settings.showDestinationFolderDuringCreate = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Allow to provide slash during the file creation')
			.setDesc(
				`
                Enable this option if you want to allow file creation modal to allow slash (/) in the filename, which will help creating a folder. 
                i.e. if this option is enabled and you provide an input like Folder1/File1, this will create Folder1 and place File1 under it. If 
                the folder exists, the file will be placed under the existing folder. This will respect the default folder location and create the 
                new folder as a subfolder under the default one.
                `
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.allowSlashhDuringCreate).onChange((newValue) => {
					this.plugin.settings.allowSlashhDuringCreate = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Reverse direction of Cancel and New Note Buttons')
			.setDesc(
				`Enable this setting to change the direction of Cancel and New Note buttons within the New Note Creation Modal`
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.newNoteCancelButtonReverse).onChange((newValue) => {
					this.plugin.settings.newNoteCancelButtonReverse = newValue;
					this.plugin.saveSettings();
				});
			});

		containerEl.createEl('h2', { text: 'Style Settings' });

		containerEl.createEl('p', {
			text: `
            You can adjust most of the style settings using Style Settings plugin. Please download from Community Plugins
            to be able to adjust colors, etc. Below you can find some of the Style Settings that can not be incorporated
            to the Style Settings
        `,
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('Fixed Calendar (Only File List Scrollable)')
			.setDesc('Disable this if you want whole calendar view to be scrollable and not only the file list')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.fixedCalendar).onChange((newValue) => {
					this.plugin.settings.fixedCalendar = newValue;
					this.plugin.saveSettings();
					this.plugin.calendarForceUpdate();
				});
			});

		new Setting(containerEl)
			.setName('File Names Overflow Behaviour')
			.setDesc('Change the default behaviour for file names when they dont fit to the view')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('hide', 'Hide Overflow')
					.addOption('scroll', 'Scroll Overflow')
					.addOption('next-line', 'Show Overflow in the Next Line')
					.setValue(this.plugin.settings.fileNameOverflowBehaviour)
					.onChange((newValue: OverflowBehaviour) => {
						this.plugin.settings.fileNameOverflowBehaviour = newValue;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});

		containerEl.createEl('h2', { text: 'Class Slot Settings' });

		new Setting(containerEl)
			.setName('Number of Time Slots')
			.setDesc('How many class periods per day (1-6)')
			.addDropdown((dropdown) => {
				for (let i = 1; i <= 6; i++) dropdown.addOption(String(i), `${i} slots`);
				dropdown
					.setValue(String(this.plugin.settings.timeSlots.length))
					.onChange(async (newValue: string) => {
						const count = parseInt(newValue);
						const defaults = ['10:00', '12:20', '15:30', '17:50', '20:10', '21:30'];
						const current = this.plugin.settings.timeSlots;
						const newSlots = defaults.slice(0, count);
						for (let i = 0; i < count; i++) {
							if (current[i]) newSlots[i] = current[i];
						}
						this.plugin.settings.timeSlots = newSlots;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
						this.display();
					});
			});

		this.plugin.settings.timeSlots.forEach((slot, index) => {
			new Setting(containerEl)
				.setName(`Slot ${index + 1} Time`)
				.addText((text) => {
					text.setValue(slot).onChange((newValue: string) => {
						this.plugin.settings.timeSlots[index] = newValue.trim();
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
				});
		});

		const colorPresets: { [key: string]: { pending: string; done: string } } = {
			'Warm Sand': { pending: '#c4a35a', done: '#7a9e7e' },
			'Sage & Dust': { pending: '#b8a072', done: '#6e9b8e' },
			'Muted Earth': { pending: '#c9a96e', done: '#6b9e7e' },
			'Deep Forest': { pending: '#8a7540', done: '#4a7e52' },
			'Dusty Rose': { pending: '#c49494', done: '#7e8e94' },
			'Plum & Mist': { pending: '#a0889e', done: '#6e9494' },
			'Ocean Haze': { pending: '#8a9eb8', done: '#6e8e8e' },
			'Sunset Clay': { pending: '#c48868', done: '#6e9e7e' },
		};

		const pendingColorOptions = [
			'#c4a35a', '#b8a072', '#c9a96e', '#8a7540', '#c49494',
			'#a0889e', '#8a9eb8', '#c48868', '#a0a8c4', '#b08d57',
		];
		const doneColorOptions = [
			'#7a9e7e', '#6e9b8e', '#6b9e7e', '#4a7e52', '#7e8e94',
			'#6e9494', '#6e8e8e', '#6e9e7e', '#6e8e9b', '#5a8e7e',
			'#5a9e6f', '#6ea87a', '#5a8e6f', '#4a7e5f', '#6ba88a',
		];

		const colorPreviewDiv = containerEl.createDiv('oz-color-scheme-preview');
		colorPreviewDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin: 8px 0 12px; padding: 8px; background: var(--background-secondary); border-radius: 6px;';

		const pendingPreview = colorPreviewDiv.createDiv();
		pendingPreview.style.cssText = `width: 24px; height: 16px; border-radius: 3px; background: ${this.plugin.settings.slotPendingColor};`;

		const donePreview = colorPreviewDiv.createDiv();
		donePreview.style.cssText = `width: 24px; height: 16px; border-radius: 3px; background: ${this.plugin.settings.slotDoneColor};`;

		const previewLabel = colorPreviewDiv.createEl('span', { text: 'Pending / Done' });
		previewLabel.style.cssText = 'font-size: 0.85em; color: var(--text-muted);';

		const renderColorPicker = (
			name: string,
			desc: string,
			currentColor: string,
			options: string[],
			applyColor: (color: string) => void
		) => {
			const setting = new Setting(containerEl).setName(name).setDesc(desc);

			const swatchContainer = setting.controlEl.createDiv();
			swatchContainer.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;';

			options.forEach((color) => {
				const swatch = swatchContainer.createDiv();
				swatch.style.cssText = `width: 20px; height: 20px; border-radius: 4px; background: ${color}; cursor: pointer; border: 2px solid ${color === currentColor ? 'var(--text-normal)' : 'transparent'};`;
				swatch.addEventListener('click', () => {
					applyColor(color);
					this.display();
				});
			});

			setting.addText((text) => {
				text.setPlaceholder('#hexcolor').setValue(currentColor).onChange((newValue: string) => {
					if (/^#[0-9a-fA-F]{6}$/.test(newValue)) {
						applyColor(newValue);
					}
				});
			});
		};

		renderColorPicker(
			'Pending Color',
			'Color for feedback not yet submitted',
			this.plugin.settings.slotPendingColor,
			pendingColorOptions,
			(color: string) => {
				this.plugin.settings.slotPendingColor = color;
				this.plugin.saveSettings();
				this.plugin.calendarForceUpdate();
			}
		);

		renderColorPicker(
			'Done Color',
			'Color for feedback submitted',
			this.plugin.settings.slotDoneColor,
			doneColorOptions,
			(color: string) => {
				this.plugin.settings.slotDoneColor = color;
				this.plugin.saveSettings();
				this.plugin.calendarForceUpdate();
			}
		);

		new Setting(containerEl)
			.setName('Color Scheme Presets')
			.setDesc('Apply a complete preset color scheme')
			.addButton((btn) => {
				btn.setButtonText('Reset Presets').onClick(async () => {
					this.plugin.settings.timeSlots = ['10:00', '12:20', '15:30', '17:50', '20:10'];
					this.plugin.settings.slotPendingColor = '#c4a35a';
					this.plugin.settings.slotDoneColor = '#7a9e7e';
					await this.plugin.saveSettings();
					this.plugin.calendarForceUpdate();
					this.display();
				});
			});

		const presetGroupDiv = containerEl.createDiv('oz-preset-groups');
		presetGroupDiv.style.cssText = 'display: flex; flex-direction: column; gap: 6px; margin: 8px 0;';

		Object.entries(colorPresets).forEach(([name, colors]) => {
			const row = presetGroupDiv.createDiv();
			row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--background-secondary); border-radius: 6px; cursor: pointer;';
			row.addEventListener('click', async () => {
				this.plugin.settings.slotPendingColor = colors.pending;
				this.plugin.settings.slotDoneColor = colors.done;
				await this.plugin.saveSettings();
				this.plugin.calendarForceUpdate();
				this.display();
			});

			const pSwatch = row.createDiv();
			pSwatch.style.cssText = `width: 18px; height: 18px; border-radius: 3px; background: ${colors.pending};`;

			const dSwatch = row.createDiv();
			dSwatch.style.cssText = `width: 18px; height: 18px; border-radius: 3px; background: ${colors.done};`;

			const label = row.createEl('span', { text: name });
			label.style.cssText = 'font-size: 0.9em;';
		});

		containerEl.createEl('h2', { text: 'Schedule Settings' });

		new Setting(containerEl)
			.setName('Edit Schedule')
			.setDesc('Open the schedule editor to mark rest days and overtime days')
			.addButton((button) => {
				button.setButtonText('Open Schedule Editor');
				button.onClick(() => {
					this.plugin.openScheduleModal();
				});
			});

		new Setting(containerEl)
			.setName('Clear All Schedule Data')
			.setDesc('Remove all schedule data (this action cannot be undone)')
			.addButton((button) => {
				button.setButtonText('Clear All');
				button.setWarning();
				button.onClick(async () => {
					this.plugin.scheduleData = {};
					await this.plugin.saveScheduleData();
					this.plugin.calendarForceUpdate();
					this.display();
				});
			});
	}
}
