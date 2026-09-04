import React, { useMemo } from 'react';
import { BsArrowRight, BsArrowLeft } from 'react-icons/bs';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { RiPhoneFindLine } from 'react-icons/ri';
import { MdToday } from 'react-icons/md';
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

	const setNewSelectedDay = (nrChange: number) => {
		let newDate = dayjs(selectedDay).add(nrChange, 'day');
		setSelectedDay(newDate.toDate());
	};

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

	const monthlyNoteCount = useMemo(() => {
		const currentMonth = dayjs(selectedDay).format('YYYY-MM');
		let count = 0;
		for (const dateKey in plugin.OZCALENDARDAYS_STATE) {
			if (dateKey.startsWith(currentMonth)) {
				count += plugin.OZCALENDARDAYS_STATE[dateKey].filter(
					(item) => item.type === 'note'
				).length;
			}
		}
		return count;
	}, [selectedDay, forceValue]);

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
			<div className="oz-calendar-notelist-header-container">
				<div className="oz-calendar-nav-action-left">
					<BsArrowLeft size={22} aria-label="Go to previous day" onClick={() => setNewSelectedDay(-1)} />
				</div>
				<div
					className="oz-calendar-nav-action-middle"
					aria-label="Show active date on calendar"
					onClick={() => setActiveStartDate(selectedDay)}>
					{dayjs(selectedDay).format('DD MMM YYYY')}
				</div>
				<div className="oz-calendar-nav-action-right">
					<BsArrowRight size={22} aria-label="Go to next day" onClick={() => setNewSelectedDay(1)} />
				</div>
				<div className="oz-calendar-nav-action-today">
					<MdToday
						size={20}
						aria-label="Set today as selected day"
						onClick={() => {
							setActiveStartDate(new Date());
							setSelectedDay(new Date());
						}}
					/>
				</div>
				<div className="oz-calendar-monthly-count">
					<span>当月总课次</span>
					<span className="oz-calendar-count-number">{monthlyNoteCount}</span>
				</div>
			</div>
			<div className="oz-calendar-notelist-container">
				{selectedDayNotes.length === 0 && (
					<div className="oz-calendar-note-no-note">
						<RiPhoneFindLine className="oz-calendar-no-note-icon" />
						No note found
					</div>
				)}
				{selectedDayNotes.map((ozNote) => {
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
