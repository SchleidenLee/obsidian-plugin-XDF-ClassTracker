import OZCalendarPlugin from 'main';
import { PluginSettingTab, App, Setting } from 'obsidian';

export type OpenFileBehaviourType = 'new-tab' | 'obsidian-default';
export type DateSourceOption = 'filename' | 'yaml';
export type CalendarType = 'US' | 'ISO 8601';

export interface OZCalendarPluginSettings {
	openViewOnStart: boolean;
	calendarType: CalendarType;
	dateSource: DateSourceOption;
	yamlKey: string;
	dateFormat: string;
	fixedCalendar: boolean;
	openFileBehaviour: OpenFileBehaviourType;
	showWeekNumbers: boolean;
	timeSlots: string[];
	slotPendingColor: string;
	slotDoneColor: string;
	slotOverdueColor: string;
}

export const DEFAULT_SETTINGS: OZCalendarPluginSettings = {
	openViewOnStart: true,
	calendarType: 'ISO 8601',
	dateSource: 'yaml',
	yamlKey: 'Date',
	dateFormat: 'YYYY-MM-DD hh:mm:ss',
	fixedCalendar: true,
	openFileBehaviour: 'new-tab',
	showWeekNumbers: false,
	timeSlots: ['10:00', '12:20', '15:30', '17:50', '20:10'],
	slotPendingColor: '#c4a35a',
	slotDoneColor: '#7a9e7e',
	slotOverdueColor: '#e25d5d',
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

		containerEl.createEl('h1', { text: 'XDF ClassTracker 插件设置' });

		containerEl.createEl('h2', { text: '课节时段设置' });

		new Setting(containerEl)
			.setName('每天课节数')
			.setDesc('每天有几节课（1-6 节）')
			.addDropdown((dropdown) => {
				for (let i = 1; i <= 6; i++) dropdown.addOption(String(i), `${i} 节`);
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
				.setName(`第 ${index + 1} 节时间`)
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

		const overduePreview = colorPreviewDiv.createDiv();
		overduePreview.style.cssText = `width: 24px; height: 16px; border-radius: 3px; background: ${this.plugin.settings.slotOverdueColor};`;

		const donePreview = colorPreviewDiv.createDiv();
		donePreview.style.cssText = `width: 24px; height: 16px; border-radius: 3px; background: ${this.plugin.settings.slotDoneColor};`;

		const previewLabel = colorPreviewDiv.createEl('span', { text: '待提交 / 已逾期 / 已完成' });
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
			'待提交颜色',
			'反馈尚未提交时的色块颜色',
			this.plugin.settings.slotPendingColor,
			pendingColorOptions,
			(color: string) => {
				this.plugin.settings.slotPendingColor = color;
				this.plugin.saveSettings();
				this.plugin.calendarForceUpdate();
			}
		);

		renderColorPicker(
			'已完成颜色',
			'反馈已提交时的色块颜色',
			this.plugin.settings.slotDoneColor,
			doneColorOptions,
			(color: string) => {
				this.plugin.settings.slotDoneColor = color;
				this.plugin.saveSettings();
				this.plugin.calendarForceUpdate();
			}
		);

		const overdueColorOptions = [
			'#e25d5d', '#d94a4a', '#c73e3e', '#f06666', '#ff7b7b',
			'#ff5c5c', '#ff4d4d', '#ff6b6b', '#f55e5e', '#e65656',
		];

		renderColorPicker(
			'已逾期颜色',
			'反馈超过截止时间未提交时的警示色块',
			this.plugin.settings.slotOverdueColor,
			overdueColorOptions,
			(color: string) => {
				this.plugin.settings.slotOverdueColor = color;
				this.plugin.saveSettings();
				this.plugin.calendarForceUpdate();
			}
		);

		new Setting(containerEl)
			.setName('配色方案')
			.setDesc('一键应用预设配色方案')
			.addButton((btn) => {
				btn.setButtonText('重置为默认配色').onClick(async () => {
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

		containerEl.createEl('h2', { text: '通用设置' });

		new Setting(containerEl)
			.setName('启动时打开日历')
			.setDesc('关闭后，启动 Obsidian 时不会自动打开日历视图')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openViewOnStart).onChange((newValue) => {
					this.plugin.settings.openViewOnStart = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('日历类型')
			.setDesc('选择日历显示类型。US 类型从周日开始，ISO 8601 类型从周一开始')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('ISO 8601', 'ISO 8601（周一开始）')
					.addOption('US', 'US（周日开始）')
					.setValue(this.plugin.settings.calendarType)
					.onChange((newValue: CalendarType) => {
						this.plugin.settings.calendarType = newValue;
						this.plugin.saveSettings();
						this.plugin.calendarForceUpdate();
					});
			});

		new Setting(containerEl)
			.setName('显示周数')
			.setDesc('开启后，日历视图将显示周数')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showWeekNumbers).onChange((newValue) => {
					this.plugin.settings.showWeekNumbers = newValue;
					this.plugin.saveSettings();
					this.plugin.calendarForceUpdate();
				});
			});

		new Setting(containerEl)
			.setName('文件打开方式')
			.setDesc('选择点击日历视图中的文件名时的打开方式')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('obsidian-default', 'Obsidian 默认行为')
					.addOption('new-tab', '在新标签页打开')
					.setValue(this.plugin.settings.openFileBehaviour)
					.onChange((newValue: OpenFileBehaviourType) => {
						this.plugin.settings.openFileBehaviour = newValue;
						this.plugin.saveSettings();
					});
			});

		containerEl.createEl('h2', { text: '日期来源与格式设置' });

		containerEl.createEl('p', {
			text: '修改 YAML 键名或日期格式后，请点击下方「重新加载插件」按钮使更改生效。',
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('日期来源')
			.setDesc('选择每个文件夹使用的日期来源，可以是 YAML 键名或文件名。插件将根据日期格式设置来解析日期。')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('filename', '文件名')
					.addOption('yaml', 'YAML 键名')
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
			.setName('YAML 键名')
			.setDesc('设置日历中使用的 YAML 键名')
			.addText((text) => {
				text.setValue(this.plugin.settings.yamlKey).onChange((newValue) => {
					this.plugin.settings.yamlKey = newValue;
					this.plugin.saveSettings();
				});
			});

		if (this.plugin.settings.dateSource === 'filename') yamlKeySetting.setClass('oz-calendar-custom-hidden');

		new Setting(containerEl)
			.setName('日期格式')
			.setDesc('设置 YAML 键名或文件名中使用的日期格式。如果使用文件名，请避免使用 Obsidian 不支持的特殊字符（如冒号）。修改此值后请重新加载插件。')
			.addText((text) => {
				text.setValue(this.plugin.settings.dateFormat).onChange((newValue) => {
					this.plugin.settings.dateFormat = newValue;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('重新加载插件')
			.setDesc('修改 YAML 键名或日期格式后，请点击此按钮重新加载插件')
			.addButton((button) => {
				button.setButtonText('重新加载插件');
				button.onClick(() => {
					this.plugin.reloadPlugin();
				});
			});

		containerEl.createEl('h2', { text: '外观设置' });

		new Setting(containerEl)
			.setName('固定日历高度')
			.setDesc('开启后，只有笔记列表可滚动，日历部分保持固定')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.fixedCalendar).onChange((newValue) => {
					this.plugin.settings.fixedCalendar = newValue;
					this.plugin.saveSettings();
					this.plugin.calendarForceUpdate();
				});
			});

		containerEl.createEl('h2', { text: '排班设置' });

		new Setting(containerEl)
			.setName('编辑排班表')
			.setDesc('打开排班编辑器，标记休息日和加班日')
			.addButton((button) => {
				button.setButtonText('打开排班编辑器');
				button.onClick(() => {
					this.plugin.openScheduleModal();
				});
			});

		new Setting(containerEl)
			.setName('清空排班数据')
			.setDesc('删除所有排班数据（此操作不可撤销）')
			.addButton((button) => {
				button.setButtonText('清空');
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
