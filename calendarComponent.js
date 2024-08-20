import { LightningElement, track } from 'lwc';
import getEventsForMonth from '@salesforce/apex/CalendarController.getEventsForMonth';
import DAYJS from '@salesforce/resourceUrl/dayjs'; // Reference to Day.js static resource
import { loadScript } from 'lightning/platformResourceLoader';
export default class CalendarComponent extends LightningElement {
    @track month;
    @track year;
    @track calendarDays = [];
    @track events = [];
    @track error;
    dayjs; // Variable to hold Day.js

    weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Load Day.js library
    renderedCallback() {
        if (this.dayjs) {
            return; // Day.js already loaded
        }
        loadScript(this, DAYJS)
            .then(() => {
                this.dayjs = window.dayjs; // Assign Day.js to the class property
                this.initializeCalendar();
            })
            .catch(error => {
                this.error = error;
                console.error('Error loading Day.js: ', error);
            });
    }

    // Initialize the calendar with the current month and year
    initializeCalendar() {
        const today = this.dayjs();
        this.month = today.month() + 1; // Day.js months are 0-indexed
        this.year = today.year();
        this.generateCalendar(this.month, this.year);
        this.loadEvents(this.month, this.year);
    }

    get monthName() {
        return this.monthNames[this.month - 1];
    }

    generateCalendar(month, year) {
        const startOfMonth = this.dayjs(`${year}-${month}-01`);
        const firstDayOfWeek = startOfMonth.day();
        const daysInMonth = startOfMonth.daysInMonth();

        const calendarDays = [];

        // Create empty cells for days before the start of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            calendarDays.push({ key: `blank-${i}`, date: '', events: [], className: 'calendar-cell' });
        }

        // Fill actual days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = this.isToday(day, month, year);
            const className = isToday ? 'calendar-cell today' : 'calendar-cell';
            calendarDays.push({ key: day, date: day, events: [], className });
        }

        this.calendarDays = calendarDays;
    }

    isToday(day, month, year) {
        const today = this.dayjs();
        return today.date() === day && today.month() + 1 === month && today.year() === year;
    }

    // Load events for the given month and year from the Apex controller
    loadEvents(month, year) {
        getEventsForMonth({ month: month, year: year })
            .then(result => {
                this.events = result;
                this.mapEventsToCalendar();
            })
            .catch(error => {
                this.error = error;
                console.error('Error fetching events: ', error);
            });
    }

    // Map events to the corresponding calendar days
    mapEventsToCalendar() {
        this.calendarDays = this.calendarDays.map(dayObj => {
            const eventsForDay = this.events.filter(event => {
                const eventDate = this.dayjs(event.StartDateTime);
                return eventDate.date() === dayObj.date;
            });

            return {
                ...dayObj,
                events: eventsForDay
            };
        });
    }

    // Navigate to the previous month
    prevMonth() {
        const currentMonth = this.dayjs(`${this.year}-${this.month}-01`).subtract(1, 'month');
        this.month = currentMonth.month() + 1;
        this.year = currentMonth.year();
        this.updateCalendar(currentMonth);
    }

    // Navigate to the next month
    nextMonth() {
        const currentMonth = this.dayjs(`${this.year}-${this.month}-01`).add(1, 'month');
        this.month = currentMonth.month() + 1;
        this.year = currentMonth.year();
        this.updateCalendar(currentMonth);
    }

    // Update the calendar with the new month and year
    updateCalendar(date) {
        this.generateCalendar(date.month() + 1, date.year());
        this.loadEvents(date.month() + 1, date.year());
    }
}
