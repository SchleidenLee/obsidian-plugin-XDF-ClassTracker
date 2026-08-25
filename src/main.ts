import { CachedMetadata, Menu, Plugin, TAbstractFile, TFile, addIcon } from 'obsidian';
import { OZCalendarView, VIEW_TYPE } from 'view';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { DayChangeCommandAction, OZCalendarDaysMap, fileToOZItem, ScheduleData } from 'types';
import { OZCAL_ICON } from './util/icons';
import { OZCalendarPluginSettings, DEFAULT_SETTINGS, OZCalendarPluginSettingsTab } from './settings/settings';
import { CreateNoteModal } from 'modal';
import { ScheduleModal } from './ScheduleModal';

export default class OZCalendarPlugin extends Plugin {
	settings: OZCalendarPluginSettings;
	dayjs = dayjs;
	OZCALENDARDAYS_STATE: OZCalendarDaysMap = {};
	scheduleData: ScheduleData = {};
	feedbackCache: Map<string, { needSendFeedback?: boolean; feedbackTaskDone?: boolean }> = new Map();
	initialScanCompleted: boolean = false;
	EVENT_TYPES = {
		forceUpdate: 'ozCalendarForceUpdate',
		changeDate: 'ozCalendarChangeDate',
		createNote: 'ozCalendarCreateNote',
	};

	dayMonthSelectorQuery = '.oz-calendar-plugin-view .react-calendar__tile.react-calendar__month-view__days__day';

	async onload() {
		addIcon('OZCAL_ICON', OZCAL_ICON);

		dayjs.extend(customParseFormat);

		// Load Settings
		this.addSettingTab(new OZCalendarPluginSettingsTab(this.app, this));
		await this.loadSettings();

		// Load Schedule Data from Plugin Directory
		await this.loadScheduleData();

		this.registerView(VIEW_TYPE, (leaf) => {
			return new OZCalendarView(leaf, this);
		});

		this.app.metadataCache.on('resolved', async () => {
			// Run only during initial vault load, changes are handled separately
			if (!this.initialScanCompleted) {
				this.OZCALENDARDAYS_STATE = await this.getNotesWithDates();
				this.initialScanCompleted = true;
				this.calendarForceUpdate();
			}
		});

		this.app.workspace.onLayoutReady(async () => {
			this.OZCALENDARDAYS_STATE = await this.getNotesWithDates();
			if (this.settings.openViewOnStart) {
				this.openOZCalendarLeaf({ showAfterAttach: true });
			}
		});

		this.registerEvent(this.app.metadataCache.on('changed', this.handleCacheChange));
		this.registerEvent(this.app.vault.on('rename', this.handleRename));
		this.registerEvent(this.app.vault.on('delete', this.handleDelete));
		this.registerEvent(this.app.vault.on('create', this.handleCreate));

		// Add Event Handler for Custom Note Creation
		document.on('contextmenu', this.dayMonthSelectorQuery, this.handleMonthDayContextMenu);

		this.addCommand({
			id: 'oz-calendar-next-day',
			name: 'Go to Next Day',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.changeDate, {
						detail: {
							action: 'next-day' as DayChangeCommandAction,
						},
					})
				);
			},
		});

		this.addCommand({
			id: 'oz-calendar-previous-day',
			name: 'Go to Previous Day',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.changeDate, {
						detail: {
							action: 'previous-day' as DayChangeCommandAction,
						},
					})
				);
			},
		});

		this.addCommand({
			id: 'oz-calendar-today',
			name: 'Go to Today',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.changeDate, {
						detail: {
							action: 'today' as DayChangeCommandAction,
						},
					})
				);
			},
		});

		this.addCommand({
			id: 'oz-calendar-new-note',
			name: 'Create a New Note',
			callback: () => {
				window.dispatchEvent(
					new CustomEvent(this.EVENT_TYPES.createNote, {
						detail: {},
					})
				);
			},
		});

		this.addCommand({
			id: 'oz-calendar-open-leaf',
			name: 'Open OZ Calendar',
			callback: () => {
				this.openOZCalendarLeaf({ showAfterAttach: true });
			},
		});
	}

	onunload() {
		// Remove Event Handler for Custom Note Creation
		document.off('contextmenu', this.dayMonthSelectorQuery, this.handleMonthDayContextMenu);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/* ------------ HANDLE VAULT CHANGES - HELPERS ------------ */

	/**
	 * Extract time (HH:mm) from a date string using the configured date format
	 * @param dateStr - The full date string from YAML
	 * @returns Time in HH:mm format, or undefined if not parseable
	 */
	extractTimeFromDate = (dateStr: string): string | undefined => {
		try {
			const parsed = dayjs(dateStr, this.settings.dateFormat);
			if (parsed.isValid()) {
				return parsed.format('HH:mm');
			}
		} catch (e) {
			// Ignore parsing errors
		}
		return undefined;
	};

	/**
	 * Extract feedback info from file cache and content
	 * @param file - The TFile to scan
	 * @returns { needSendFeedback, feedbackTaskDone }
	 */
	extractFeedbackInfo = async (
		file: TFile
	): Promise<{ needSendFeedback?: boolean; feedbackTaskDone?: boolean }> => {
		const cache = this.app.metadataCache.getCache(file.path);
		let needSendFeedback = false;

		if (cache?.frontmatter?.need_send_feedback !== undefined) {
			needSendFeedback = cache.frontmatter.need_send_feedback === true;
		}

		if (!needSendFeedback) {
			return {};
		}

		// Read file content to find the feedback task
		let feedbackTaskDone = false;
		try {
			const content = await this.app.vault.read(file);
			if (content.includes('- [x] 提交反馈')) {
				feedbackTaskDone = true;
			} else if (content.includes('- [ ] 提交反馈')) {
				feedbackTaskDone = false;
			}
		} catch (e) {
			// Ignore read errors
		}

		return { needSendFeedback: true, feedbackTaskDone };
	};

	/**
	 * Adds the provided filePath to the corresponding date within plugin state
	 * @param date
	 * @param file
	 * @param time - Optional time string (HH:mm) from YAML
	 * @param needSendFeedback - Whether feedback needs to be sent
	 * @param feedbackTaskDone - Whether feedback task is completed
	 */
	addFilePathToState = (
		date: string,
		file: TFile,
		time?: string,
		needSendFeedback?: boolean,
		feedbackTaskDone?: boolean
	) => {
		let newStateMap = this.OZCALENDARDAYS_STATE;
		// if exists, add the new file path
		if (date in newStateMap) {
			newStateMap[date] = [
				...newStateMap[date],
				fileToOZItem({ note: file, time, needSendFeedback, feedbackTaskDone }),
			];
		} else {
			newStateMap[date] = [fileToOZItem({ note: file, time, needSendFeedback, feedbackTaskDone })];
		}
		this.OZCALENDARDAYS_STATE = newStateMap;
	};

	/**
	 * Scans the plugin state and removes the file path if found
	 * @param filePath
	 * @returns true if the file path is found and deleted
	 */
	removeFilePathFromState = (filePath: string): boolean => {
		let changeFlag = false;
		let newStateMap = this.OZCALENDARDAYS_STATE;
		for (let k of Object.keys(newStateMap)) {
			if (newStateMap[k].some((ozItem) => ozItem.type === 'note' && ozItem.path === filePath)) {
				newStateMap[k] = newStateMap[k].filter((ozItem) => {
					return !(ozItem.type === 'note' && ozItem.path === filePath);
				});
				changeFlag = true;
			}
		}
		this.OZCALENDARDAYS_STATE = newStateMap;
		return changeFlag;
	};

	/**
	 * Scans the file provided for users date key and adds to the plugin state
	 * @param file
	 * @returns boolean (if any change happened, true)
	 */
	scanTFileDate = async (file: TFile): Promise<boolean> => {
		let cache = this.app.metadataCache.getCache(file.path);
		let changeFlag = false;
		if (cache && cache.frontmatter) {
			let fm = cache.frontmatter;
			for (let k of Object.keys(cache.frontmatter)) {
				if (k === this.settings.yamlKey) {
					let fmValue = String(fm[k]);
					let parsedDayISOString = dayjs(fmValue, this.settings.dateFormat).format('YYYY-MM-DD');
					let time = this.extractTimeFromDate(fmValue);
					const feedbackInfo = await this.extractFeedbackInfo(file);
					this.addFilePathToState(
						parsedDayISOString,
						file,
						time,
						feedbackInfo.needSendFeedback,
						feedbackInfo.feedbackTaskDone
					);
					changeFlag = true;
				}
			}
		}
		return changeFlag;
	};

	/**
	 * Use this function to force update the calendar and file list view
	 */
	calendarForceUpdate = () => {
		window.dispatchEvent(
			new CustomEvent(this.EVENT_TYPES.forceUpdate, {
				detail: {},
			})
		);
	};

	/* ------------ HANDLE VAULT CHANGES - LISTENER FUNCTIONS ------------ */

	handleCacheChange = async (file: TFile, data: string, cache: CachedMetadata) => {
		// Update feedback cache
		this.feedbackCache.delete(file.path);

		if (this.settings.dateSource === 'yaml') {
			this.removeFilePathFromState(file.path);
			if (cache && cache.frontmatter) {
				let fm = cache.frontmatter;
				for (let k of Object.keys(cache.frontmatter)) {
					if (k === this.settings.yamlKey) {
						let fmValue = String(fm[k]);
						let parsedDayISOString = dayjs(fmValue, this.settings.dateFormat).format('YYYY-MM-DD');
						let time = this.extractTimeFromDate(fmValue);
						const feedbackInfo = await this.extractFeedbackInfo(file);
						// If date doesn't exist, create a new one
						if (!(parsedDayISOString in this.OZCALENDARDAYS_STATE)) {
							this.addFilePathToState(
								parsedDayISOString,
								file,
								time,
								feedbackInfo.needSendFeedback,
								feedbackInfo.feedbackTaskDone
							);
						} else {
							// if date exists and note is not in the date list
							if (!(file.path in this.OZCALENDARDAYS_STATE[parsedDayISOString])) {
								this.addFilePathToState(
									parsedDayISOString,
									file,
									time,
									feedbackInfo.needSendFeedback,
									feedbackInfo.feedbackTaskDone
								);
							}
						}
					}
				}
			}
			this.calendarForceUpdate();
		} else if (this.settings.dateSource === 'filename') {
			// No action needed
		}
	};

	handleRename = async (file: TFile, oldPath: string) => {
		// Update feedback cache for renamed file
		this.feedbackCache.delete(oldPath);

		let changeFlag = false;
		if (file instanceof TFile && file.extension === 'md') {
			for (let k of Object.keys(this.OZCALENDARDAYS_STATE)) {
				for (let ozItem of this.OZCALENDARDAYS_STATE[k]) {
					if (ozItem.type === 'note' && ozItem.path === oldPath) {
						if (this.settings.dateSource === 'yaml') {
							ozItem.path = file.path;
							ozItem.displayName = file.basename;
							// Re-extract time from the file's YAML
							let cache = this.app.metadataCache.getCache(file.path);
							if (cache && cache.frontmatter) {
								let fm = cache.frontmatter;
								for (let fmKey of Object.keys(cache.frontmatter)) {
									if (fmKey === this.settings.yamlKey) {
										let fmValue = String(fm[fmKey]);
										ozItem.time = this.extractTimeFromDate(fmValue);
									}
								}
							}
							// Re-extract feedback info
							const feedbackInfo = await this.extractFeedbackInfo(file);
							ozItem.needSendFeedback = feedbackInfo.needSendFeedback;
							ozItem.feedbackTaskDone = feedbackInfo.feedbackTaskDone;
							changeFlag = true;
						} else if (this.settings.dateSource === 'filename') {
							this.OZCALENDARDAYS_STATE[k] = this.OZCALENDARDAYS_STATE[k].filter((ozItem) => {
								return !(ozItem.type === 'note' && ozItem.path === oldPath);
							});
							changeFlag = true;
						}
					}
				}
			}
		}

		// Make sure that you scan the new file name for filename source
		if (this.settings.dateSource === 'filename' && dayjs(file.name, this.settings.dateFormat).isValid()) {
			let parsedDayISOString = dayjs(file.name, this.settings.dateFormat).format('YYYY-MM-DD');
			if (parsedDayISOString in this.OZCALENDARDAYS_STATE) {
				this.OZCALENDARDAYS_STATE[parsedDayISOString] = [
					...this.OZCALENDARDAYS_STATE[parsedDayISOString],
					fileToOZItem({ note: file }),
				];
			} else {
				this.OZCALENDARDAYS_STATE[parsedDayISOString] = [fileToOZItem({ note: file })];
			}
			changeFlag = true;
		}

		// If change happened force update the component
		if (changeFlag) this.calendarForceUpdate();
	};

	handleDelete = (file: TAbstractFile) => {
		let changeFlag = this.removeFilePathFromState(file.path);
		if (changeFlag) this.calendarForceUpdate();
	};

	handleCreate = (file: TAbstractFile) => {
		if (file instanceof TFile && file.extension === 'md' && this.settings.dateSource === 'filename') {
			if (dayjs(file.name, this.settings.dateFormat).isValid()) {
				let parsedDayISOString = dayjs(file.name, this.settings.dateFormat).format('YYYY-MM-DD');
				if (parsedDayISOString in this.OZCALENDARDAYS_STATE) {
					this.OZCALENDARDAYS_STATE[parsedDayISOString] = [
						...this.OZCALENDARDAYS_STATE[parsedDayISOString],
						fileToOZItem({ note: file }),
					];
				} else {
					this.OZCALENDARDAYS_STATE[parsedDayISOString] = [fileToOZItem({ note: file })];
				}
			}
			this.calendarForceUpdate();
		}
	};

	/* ------------ OTHER FUNCTIONS ------------ */

	openOZCalendarLeaf = async (params: { showAfterAttach: boolean }) => {
		const { showAfterAttach } = params;
		let leafs = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (leafs.length === 0) {
			let leaf = this.app.workspace.getRightLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE });
			if (showAfterAttach) this.app.workspace.revealLeaf(leaf);
		} else {
			if (showAfterAttach && leafs.length > 0) {
				this.app.workspace.revealLeaf(leafs[0]);
			}
		}
	};

	openScheduleModal = () => {
		const modal = new ScheduleModal(this);
		modal.open();
	};

	getScheduleFilePath = () => {
		const pluginsDir = this.manifest.dir;
		return `${pluginsDir}/schedule.json`;
	};

	loadScheduleData = async () => {
		try {
			const schedulePath = this.getScheduleFilePath();
			const exists = await this.app.vault.adapter.exists(schedulePath);
			if (exists) {
				const content = await this.app.vault.adapter.read(schedulePath);
				const data = JSON.parse(content);
				if (data && data.scheduleData) {
					this.scheduleData = data.scheduleData;
				}
			}
		} catch (e) {
			console.warn('Failed to load schedule data:', e);
		}
	};

	saveScheduleData = async () => {
		try {
			const schedulePath = this.getScheduleFilePath();
			const content = JSON.stringify({ scheduleData: this.scheduleData }, null, 2);
			await this.app.vault.adapter.write(schedulePath, content);
		} catch (e) {
			console.warn('Failed to save schedule data:', e);
		}
	};

	reloadPlugin = () => {
		// @ts-ignore
		this.app.plugins.disablePlugin('oz-calendar');
		// @ts-ignore
		this.app.plugins.enablePlugin('oz-calendar');
	};

	getNotesWithDates = async (): Promise<OZCalendarDaysMap> => {
		let mdFiles = this.app.vault.getMarkdownFiles();
		let OZCalendarDays: OZCalendarDaysMap = {};
		// Clear feedback cache before full scan
		this.feedbackCache.clear();
		for (let mdFile of mdFiles) {
			if (this.settings.dateSource === 'yaml') {
				// Get the file Cache
				let fileCache = this.app.metadataCache.getFileCache(mdFile);
				// Check if there is Frontmatter
				if (fileCache && fileCache.frontmatter) {
					let fm = fileCache.frontmatter;
					// Check the FM keys vs the provided key by the user in settings
					for (let k of Object.keys(fm)) {
						if (k === this.settings.yamlKey) {
							let fmValue = String(fm[k]);
							// Parse the date with provided date format
							let parsedDayJsDate = dayjs(fmValue, this.settings.dateFormat);
							// Take only YYYY-MM-DD part fromt the date as String
							let parsedDayISOString = parsedDayJsDate.format('YYYY-MM-DD');
							// Extract time (HH:mm) from the full date
							let time = parsedDayJsDate.format('HH:mm');
							// Extract feedback info
							const feedbackInfo = await this.extractFeedbackInfo(mdFile);
							// Check if it already exists
							if (parsedDayISOString in OZCalendarDays) {
								OZCalendarDays[parsedDayISOString] = [
									...OZCalendarDays[parsedDayISOString],
									fileToOZItem({
										note: mdFile,
										time,
										needSendFeedback: feedbackInfo.needSendFeedback,
										feedbackTaskDone: feedbackInfo.feedbackTaskDone,
									}),
								];
							} else {
								OZCalendarDays[parsedDayISOString] = [
									fileToOZItem({
										note: mdFile,
										time,
										needSendFeedback: feedbackInfo.needSendFeedback,
										feedbackTaskDone: feedbackInfo.feedbackTaskDone,
									}),
								];
							}
						}
					}
				}
			} else if (this.settings.dateSource === 'filename') {
				let dateFormatLength = this.settings.dateFormat.length;
				if (mdFile.name.length >= dateFormatLength) {
					if (dayjs(mdFile.name, this.settings.dateFormat).isValid()) {
						let parsedDayISOString = dayjs(mdFile.name, this.settings.dateFormat).format('YYYY-MM-DD');
						const feedbackInfo = await this.extractFeedbackInfo(mdFile);
						if (parsedDayISOString in OZCalendarDays) {
							OZCalendarDays[parsedDayISOString] = [
								...OZCalendarDays[parsedDayISOString],
								fileToOZItem({
									note: mdFile,
									needSendFeedback: feedbackInfo.needSendFeedback,
									feedbackTaskDone: feedbackInfo.feedbackTaskDone,
								}),
							];
						} else {
							OZCalendarDays[parsedDayISOString] = [
								fileToOZItem({
									note: mdFile,
									needSendFeedback: feedbackInfo.needSendFeedback,
									feedbackTaskDone: feedbackInfo.feedbackTaskDone,
								}),
							];
						}
					}
				}
			}
		}
		return OZCalendarDays;
	};

	handleMonthDayContextMenu = (ev: MouseEvent, delegateTarget: HTMLElement) => {
		let abbrItem = delegateTarget.querySelector('abbr[aria-label]');
		if (abbrItem) {
			let destDate = abbrItem.getAttr('aria-label');
			if (destDate && destDate.length > 0) {
				let dayjsDate = dayjs(destDate, 'MMMM D, YYYY');
				let menu = new Menu();
				menu.addItem((menuItem) => {
					menuItem
						.setTitle('Create a note for this date')
						.setIcon('create-new')
						.onClick((evt) => {
							let modal = new CreateNoteModal(this, dayjsDate.toDate());
							modal.open();
						});
				});
				menu.showAtPosition({ x: ev.pageX, y: ev.pageY });
			}
		}
	};
}
