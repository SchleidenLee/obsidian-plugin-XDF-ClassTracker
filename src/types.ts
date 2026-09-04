import { TFile } from 'obsidian';

export type OZNote = {
	type: 'note';
	displayName: string;
	path: string;
	time?: string; // HH:mm format from YAML date field
	needSendFeedback?: boolean;
	feedbackTaskDone?: boolean;
};

type OZItem = OZNote;

export interface OZCalendarDaysMap {
	[key: string]: OZItem[];
}

export type DayChangeCommandAction = 'next-day' | 'previous-day' | 'today';

export type ScheduleDayType = 'rest' | 'overtime' | null;

export interface ScheduleData {
	[key: string]: ScheduleDayType;
}

export const fileToOZItem = (params: {
	note: TFile;
	time?: string;
	needSendFeedback?: boolean;
	feedbackTaskDone?: boolean;
}): OZItem => {
	return {
		type: 'note',
		displayName: params.note.basename,
		path: params.note.path,
		time: params.time,
		needSendFeedback: params.needSendFeedback,
		feedbackTaskDone: params.feedbackTaskDone,
	};
};
