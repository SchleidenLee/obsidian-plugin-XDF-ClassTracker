import { Modal, Notice } from 'obsidian';
import OZCalendarPlugin from 'main';
import dayjs from 'dayjs';
import { ScheduleDayType } from 'types';

export class ScheduleModal extends Modal {
	plugin: OZCalendarPlugin;
	activeStartDate: Date;

	constructor(plugin: OZCalendarPlugin) {
		super(plugin.app);
		this.plugin = plugin;
		this.activeStartDate = new Date();
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		const headerEl = contentEl.createEl('div', { text: 'Schedule Editor' });
		headerEl.addClass('modal-title');

		const containerEl = contentEl.createDiv('oz-schedule-modal-container');

		this.renderCalendar(containerEl);
	}

	renderCalendar(containerEl: HTMLElement): void {
		containerEl.empty();

		const navEl = containerEl.createDiv('oz-schedule-nav');

		const prevBtn = navEl.createEl('button', { text: '◀' });
		prevBtn.addClass('oz-schedule-nav-btn');
		prevBtn.addEventListener('click', () => {
			this.activeStartDate = dayjs(this.activeStartDate).subtract(1, 'month').toDate();
			this.renderCalendar(containerEl);
		});

		const monthLabel = navEl.createEl('span', {
			text: dayjs(this.activeStartDate).format('MMMM YYYY'),
		});
		monthLabel.addClass('oz-schedule-month-label');

		const nextBtn = navEl.createEl('button', { text: '▶' });
		nextBtn.addClass('oz-schedule-nav-btn');
		nextBtn.addEventListener('click', () => {
			this.activeStartDate = dayjs(this.activeStartDate).add(1, 'month').toDate();
			this.renderCalendar(containerEl);
		});

		const weekdaysHeader = containerEl.createDiv('oz-schedule-weekdays');
		const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		weekdays.forEach((day) => {
			weekdaysHeader.createEl('span', { text: day }).addClass('oz-schedule-weekday');
		});

		const calendarGrid = containerEl.createDiv('oz-schedule-grid');

		const startOfMonth = dayjs(this.activeStartDate).startOf('month');
		const firstDayOfWeek = startOfMonth.day();
		const daysInMonth = startOfMonth.daysInMonth();

		for (let i = 0; i < firstDayOfWeek; i++) {
			calendarGrid.createDiv('oz-schedule-day oz-schedule-day-empty');
		}

		for (let day = 1; day <= daysInMonth; day++) {
			const currentDate = dayjs(this.activeStartDate).date(day);
			const dateString = currentDate.format('YYYY-MM-DD');
			const dayType = this.plugin.scheduleData[dateString] || null;
			const isWeekend = currentDate.day() === 0 || currentDate.day() === 6;

			const dayEl = calendarGrid.createDiv('oz-schedule-day');
			dayEl.createEl('span', { text: String(day) }).addClass('oz-schedule-day-number');

			if (isWeekend && !dayType) {
				dayEl.addClass('oz-schedule-day-weekend');
			}

			if (dayType === 'rest') {
				dayEl.addClass('oz-schedule-day-rest');
			} else if (dayType === 'overtime') {
				dayEl.addClass('oz-schedule-day-overtime');
			}

			const labelEl = dayEl.createDiv('oz-schedule-day-label');
			if (dayType === 'rest') {
				labelEl.setText('休息');
			} else if (dayType === 'overtime') {
				labelEl.setText('加班');
			}

			dayEl.addEventListener('click', async (e) => {
				e.preventDefault();
				const currentType = this.plugin.scheduleData[dateString] || null;
				let newType: ScheduleDayType;

				if (currentType === null) {
					newType = 'rest';
				} else if (currentType === 'rest') {
					newType = 'overtime';
				} else {
					newType = null;
				}

				if (newType === null) {
					delete this.plugin.scheduleData[dateString];
				} else {
					this.plugin.scheduleData[dateString] = newType;
				}

				await this.plugin.saveScheduleData();
				this.plugin.calendarForceUpdate();
				this.renderCalendar(containerEl);
			});
		}

		const legendEl = containerEl.createDiv('oz-schedule-legend');
		const legendItems = [
			{ type: 'rest', label: '休息日 (可调休)' },
			{ type: 'overtime', label: '加班日 (有加班费)' },
		];
		legendItems.forEach((item) => {
			const itemEl = legendEl.createDiv('oz-schedule-legend-item');
			const colorBox = itemEl.createDiv(`oz-schedule-legend-box oz-schedule-legend-${item.type}`);
			itemEl.createEl('span', { text: item.label });
		});

		const closeBtn = containerEl.createEl('button', { text: 'Close' });
		closeBtn.addClass('oz-schedule-close-btn');
		closeBtn.addEventListener('click', () => {
			this.close();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
