import React, { useMemo } from 'react';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { RiPhoneFindLine } from 'react-icons/ri';

import dayjs from 'dayjs';
import OZCalendarPlugin from 'main';
import { isMouseEvent, openFile } from '../util/utils';
import { Menu, TFile } from 'obsidian';
import { VIEW_TYPE } from 'view';
import { OZNote } from 'types';

interface NoteListComponentParams {
	selectedDay: Date;
	setSelectedDay: (selectedDay: Date) => void;
	setActiveStartDate: (newActiveStartDate: Date) => void;
	plugin: OZCalendarPlugin;
	forceValue: number;
}

export default function NoteListComponent(params: NoteListComponentParams) {
	const { setSelectedDay, selectedDay, plugin, setActiveStartDate, forceValue } = params;

	const openFilePath = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, filePath: string) => {
		let abstractFile = plugin.app.vault.getAbstractFileByPath(filePath);
		let openFileBehaviour = plugin.settings.openFileBehaviour;
		if (abstractFile && abstractFile instanceof TFile) {
			let openInNewLeaf: boolean = openFileBehaviour === 'new-tab';
			openFile({
				file: abstractFile,
				plugin: plugin,
				newLeaf: openInNewLeaf,
			});
		}
	};

	const selectedDayNotes: OZNote[] = useMemo(() => {
		const selectedDayIso = dayjs(selectedDay).format('YYYY-MM-DD');
		let sortedList: OZNote[] = [];
		if (selectedDayIso in plugin.OZCALENDARDAYS_STATE) {
			sortedList = plugin.OZCALENDARDAYS_STATE[selectedDayIso].filter(
				(ozItem) => ozItem.type === 'note'
			) as OZNote[];
		}
		sortedList = sortedList.sort((a, b) => {
			if (a.time && b.time) {
				return a.time.localeCompare(b.time);
			}
			return a.displayName.localeCompare(b.displayName, 'en', { numeric: true });
		});
		return sortedList;
	}, [selectedDay, forceValue]);

	// Statistics
	const stats = useMemo(() => {
		const today = dayjs().startOf('day');
		const currentMonth = today.format('YYYY-MM');
		let monthlyTotal = 0;
		let pendingToday = 0;
		let overdue = 0;

		for (const dateKey in plugin.OZCALENDARDAYS_STATE) {
			const items = plugin.OZCALENDARDAYS_STATE[dateKey].filter((item) => item.type === 'note');
			const noteDate = dayjs(dateKey);

			// Monthly total
			if (dateKey.startsWith(currentMonth)) {
				monthlyTotal += items.length;
			}

			// Pending and Overdue calculation
			items.forEach((item) => {
				const note = item as OZNote;
				if (note.needSendFeedback && !note.feedbackTaskDone) {
					// Deadline: Course Date + 1 Day + 24:00
					const deadline = noteDate.add(1, 'day').endOf('day');
					if (today.isAfter(deadline)) {
						overdue++;
					} else if (noteDate.isSame(today, 'day')) {
						pendingToday++;
					}
				}
			});
		}
		return { monthlyTotal, pendingToday, overdue };
	}, [plugin.OZCALENDARDAYS_STATE, forceValue]);

	const triggerFileContextMenu = (e: React.MouseEvent | React.TouchEvent, filePath: string) => {
		let abstractFile = plugin.app.vault.getAbstractFileByPath(filePath);
		if (abstractFile) {
			const fileMenu = new Menu();
			plugin.app.workspace.trigger('file-menu', fileMenu, abstractFile, VIEW_TYPE);
			if (isMouseEvent(e)) {
				fileMenu.showAtPosition({ x: e.pageX, y: e.pageY });
			} else {
				// @ts-ignore
				fileMenu.showAtPosition({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
			}
		}
	};

	return (
		<>
			<div className="oz-calendar-status-bar">
				<div className="oz-status-item">
					<span className="oz-status-label">Total</span>
					<span className="oz-status-value">{stats.monthlyTotal}</span>
				</div>
				<div className="oz-status-divider"></div>
				<div className="oz-status-item">
					<span className="oz-status-label">Pending</span>
					<span className="oz-status-value oz-status-pending">{stats.pendingToday}</span>
				</div>
				<div className="oz-status-divider"></div>
				<div className="oz-status-item">
					<span className="oz-status-label">Overdue</span>
					<span className="oz-status-value oz-status-overdue">{stats.overdue}</span>
				</div>
				<div className="oz-status-spacer"></div>
			</div>
			<div className="oz-calendar-notelist-container">
				{selectedDayNotes.length === 0 && (
					<div className="oz-calendar-note-no-note">
						<RiPhoneFindLine className="oz-calendar-no-note-icon" />
						No note found
					</div>
				)}
				{selectedDayNotes.map((ozNote) => {
					const isOverdue =
						ozNote.needSendFeedback &&
						!ozNote.feedbackTaskDone &&
						dayjs().isAfter(dayjs(selectedDay).add(1, 'day').endOf('day'));

					return (
						<div
							className="oz-calendar-note-line"
							id={ozNote.path}
							key={ozNote.path}
							onClick={(e) => openFilePath(e, ozNote.path)}
							onContextMenu={(e) => triggerFileContextMenu(e, ozNote.path)}>
							{ozNote.time && (
								<span className="oz-calendar-note-time">{ozNote.time}</span>
							)}
							<HiOutlineDocumentText className="oz-calendar-note-line-icon" />
							<span className="oz-calendar-note-name">{ozNote.displayName}</span>
							{ozNote.needSendFeedback && (
								<div
									className="oz-calendar-feedback-indicator"
									style={{
										backgroundColor: ozNote.feedbackTaskDone
											? plugin.settings.slotDoneColor
											: isOverdue
											? plugin.settings.slotOverdueColor
											: plugin.settings.slotPendingColor,
									}}
								/>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
}
