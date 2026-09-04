import React, { useEffect, useState } from 'react';
import Calendar, { CalendarTileProperties } from 'react-calendar';
import OZCalendarPlugin from 'main';
import NoteListComponent from './noteList';
import dayjs from 'dayjs';
import useForceUpdate from 'hooks/forceUpdate';
import { DayChangeCommandAction } from 'types';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

export default function MyCalendar(params: { plugin: OZCalendarPlugin }) {
	const { plugin } = params;
	const [selectedDay, setSelectedDay] = useState<Date>(new Date());
	const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
	const { forceValue, forceUpdate } = useForceUpdate();

	useEffect(() => setActiveStartDate(selectedDay), [selectedDay]);

	useEffect(() => {
		window.addEventListener(plugin.EVENT_TYPES.forceUpdate, forceUpdate);
		window.addEventListener(plugin.EVENT_TYPES.changeDate, changeDate);
		return () => {
			window.removeEventListener(plugin.EVENT_TYPES.forceUpdate, forceUpdate);
			window.removeEventListener(plugin.EVENT_TYPES.changeDate, changeDate);
		};
	}, []);

	const changeDate = (e: CustomEvent) => {
		let action = e.detail.action as DayChangeCommandAction;
		let currentSelectedDay = selectedDay;

		// Event listener is not capable of getting the updates after event listener is added
		// This is created to capture current state value during the custom event dispatch
		setSelectedDay((selectedDay) => {
			currentSelectedDay = selectedDay;
			return selectedDay;
		});

		let newDate = dayjs(currentSelectedDay);
		if (action === 'next-day') {
			newDate = dayjs(currentSelectedDay).add(1, 'day');
		} else if (action === 'previous-day') {
			newDate = dayjs(currentSelectedDay).add(-1, 'day');
		} else if (action === 'today') {
			newDate = dayjs();
		}
		setSelectedDay(newDate.toDate());
	};

	const timeSlots = plugin.settings.timeSlots;

	const customTileContent = ({ date, view }: CalendarTileProperties) => {
		if (view === 'month') {
			const dateString = dayjs(date).format('YYYY-MM-DD');
			const items = dateString in plugin.OZCALENDARDAYS_STATE ? plugin.OZCALENDARDAYS_STATE[dateString] : [];

			const slotMap: { [slot: string]: { hasClass: boolean; feedbackPending: boolean } } = {};
			items.forEach((item) => {
				if (item.type === 'note' && item.time && timeSlots.includes(item.time)) {
					slotMap[item.time] = {
						hasClass: true,
						feedbackPending: !!(item as any).needSendFeedback && !(item as any).feedbackTaskDone,
					};
				}
			});

			if (Object.keys(slotMap).length === 0) return null;

			return (
				<div className="dots-wrapper">
					{timeSlots.map((slot) => {
						const slotData = slotMap[slot];
						if (!slotData || !slotData.hasClass) return <div key={slot} className="oz-slot-empty" />;
						const slotClass = slotData.feedbackPending
							? 'oz-slot-filled oz-slot-pending'
							: 'oz-slot-filled oz-slot-done';
						const bgColor = slotData.feedbackPending
							? plugin.settings.slotPendingColor
							: plugin.settings.slotDoneColor;
						return (
							<div key={slot} className={slotClass} style={{ backgroundColor: bgColor }} />
						);
					})}
				</div>
			);
		}
		return null;
	};

	const customTileClass = ({ activeStartDate, date, view }: CalendarTileProperties) => {
		let classes: string[] = [];
		let today = new Date();
		if (date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		) {
			classes.push('oz-calendar-plugin-today');
		}
		const dateString = dayjs(date).format('YYYY-MM-DD');
		const scheduleType = plugin.scheduleData[dateString];
		if (scheduleType === 'rest') {
			classes.push('oz-calendar-schedule-rest');
		} else if (scheduleType === 'overtime') {
			classes.push('oz-calendar-schedule-overtime');
		}
		return classes.join(' ');
	};

	const fixedCalendarClass = plugin.settings.fixedCalendar ? 'fixed' : '';

	const prevMonth = () => setActiveStartDate(dayjs(activeStartDate).subtract(1, 'month').toDate());
	const nextMonth = () => setActiveStartDate(dayjs(activeStartDate).add(1, 'month').toDate());

	return (
		<div className={'oz-calendar-plugin-view ' + fixedCalendarClass}>
			<div className="oz-calendar-header">
				<div className="oz-calendar-header-title">
					<span className="oz-calendar-header-month">{dayjs(activeStartDate).format('MMMM')}</span>
					<span className="oz-calendar-header-year">{dayjs(activeStartDate).format('YYYY')}</span>
				</div>
				<div className="oz-calendar-header-arrows">
					<BsChevronLeft size={14} aria-label="Previous month" onClick={prevMonth} />
					<BsChevronRight size={14} aria-label="Next month" onClick={nextMonth} />
				</div>
			</div>
			<Calendar
				locale="en-US"
				onChange={setSelectedDay}
				value={selectedDay}
				maxDetail="month"
				minDetail="month"
				showWeekNumbers={plugin.settings.showWeekNumbers}
				view="month"
				tileContent={customTileContent}
				tileClassName={customTileClass}
				calendarType={plugin.settings.calendarType}
				showFixedNumberOfWeeks={plugin.settings.fixedCalendar}
				activeStartDate={activeStartDate}
				formatMonthYear={(locale, date) => dayjs(date).format('MMMM YYYY')}
			/>
			<>
				<div id="oz-calendar-divider"></div>
				<NoteListComponent
				selectedDay={selectedDay}
				setSelectedDay={setSelectedDay}
				setActiveStartDate={setActiveStartDate}
				plugin={plugin}
				forceValue={forceValue}
			/>
			</>
		</div>
	);
}
