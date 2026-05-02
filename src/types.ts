import { TFile } from 'obsidian';

export type OZNote = {
	type: 'note';
	displayName: string;
	path: string;
	time?: string; // HH:mm format from YAML date field
};

export type OZReminder = {
	type: 'task' | 'periodic';
	displayName: string;
	date: string;
};

type OZItem = OZNote | OZReminder;

export interface OZCalendarDaysMap {
	[key: string]: OZItem[];
}

export type DayChangeCommandAction = 'next-day' | 'previous-day' | 'today';

export const fileToOZItem = (params: { note: TFile; time?: string }): OZItem => {
	return {
		type: 'note',
		displayName: params.note.basename,
		path: params.note.path,
		time: params.time,
	};
};
