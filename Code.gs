
/**
 * Entry point. Triggered by a Google Calendar event.
 */
function automaticallyAddPreviousDayReminder(e) {
  logAndUpdateSyncedEvents(e.calendarId, false);
}

/**
 * Retrieve and log events from the given calendar that have been modified
 * since the last sync. If the sync token is missing or invalid, log all
 * events from up to a month ago (a full sync).
 *
 * @param {string} calendarId The ID of the calender to retrieve events from.
 * @param {boolean} fullSync If true, throw out any existing sync token and
 *        perform a full sync; if false, use the existing sync token if possible.
 */
function logAndUpdateSyncedEvents(calendarId, fullSync) {
  var properties = PropertiesService.getUserProperties();
  var options = {
    maxResults: 100
  };
  var syncToken = properties.getProperty('syncToken');
  if (syncToken && !fullSync) {
    options.syncToken = syncToken;
  } else {
    // Sync events up to thirty days in the past.
    options.timeMin = getRelativeDate(-30, 0).toISOString();
  }

  const defaultReminders = getCalendarDefaultNotifications(calendarId);

  // Retrieve events one page at a time.
  var events;
  var pageToken;
  do {
    try {
      options.pageToken = pageToken;
      events = Calendar.Events.list(calendarId, options);
    } catch (e) {
      // Check to see if the sync token was invalidated by the server;
      // if so, perform a full sync instead.
      if (e.message === 'Sync token is no longer valid, a full sync is required.') {
        properties.deleteProperty('syncToken');
        logSyncedEvents(calendarId, true);
        return;
      } else {
        throw new Error(e.message);
      }
    }

    if (events.items && events.items.length > 0) {
      for (var i = 0; i < events.items.length; i++) {
        var event = events.items[i];
        if (event.status === 'cancelled') {
          console.log('Event id %s was cancelled.', event.id);
        } else if (event.start.date) {
          // All-day event.
          var start = new Date(event.start.date);
          console.log('%s (%s)', event.summary, start.toLocaleDateString());
        } else {
          // Events that don't last all day; they have defined start times.
          var start = new Date(event.start.dateTime);
          console.log('%s (%s)', event.summary, start.toLocaleString());
          optionallyApplyNotificationToEvent(event, defaultReminders);
        }
      }
    } else {
      console.log('No events found.');
    }

    pageToken = events.nextPageToken;
  } while (pageToken);

  properties.setProperty('syncToken', events.nextSyncToken);
}

/**
 * The API's for `add**Reminder` remove your default reminders.
 * This get's them so they can be manually added to the event.
 */
function getCalendarDefaultNotifications(calendarId) {
  const options = {
    "fields": "defaultReminders"
  };
  return Calendar.CalendarList.get(calendarId, options)["defaultReminders"];
}

/**
 * Helper function to get a new Date object relative to the current date.
 * @param {number} daysOffset The number of days in the future for the new date.
 * @param {number} hour The hour of the day for the new date, in the time zone
 *     of the script.
 * @return {Date} The new date.
 */
function getRelativeDate(daysOffset, hour) {
  var date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

/**
 * Applies a notification to the event, if it's before 9:00 AM, for 11:00 PM the previous day, if it doesn't already have one.
 * @param {Calendar.Event} event
 * @param {any[]} defaultReminders
 */
function optionallyApplyNotificationToEvent(event, defaultReminders) {
  const start = new Date(event.start.dateTime);
  if (start.getHours() < 9) { // If the event is before 9:00 AM
    const notificationPreviousDayMinutesBefore = (start.getHours() + 1) * 60 + start.getMinutes(); // A notification at 11:00 PM the previous day
    const eventPropper = CalendarApp.getEventById(event.getId());
    // Don't add the reminder if it already exists
    if (!eventPropper.getPopupReminders().includes(notificationPreviousDayMinutesBefore)) {
      console.log('[START] Adding Notification to Event: %s (%s)', event.summary, start.toLocaleString());

      console.log(event.getReminders());
      // Add the default reminders to the event as any interaction with an events notifications remove the defaults.
      defaultReminders.forEach(reminder => {
        const minutes = reminder.minutes;
        if (reminder.method == 'popup') {
          eventPropper.addPopupReminder(minutes);
        } else if (reminder.method == 'email') {
          eventPropper.addEmailReminder(minutes);
        } else if (reminder.method == 'sms') {
          eventPropper.addSmsReminder(minutes);
        }
      });
      // Add our new popup reminder
      eventPropper.addPopupReminder(notificationPreviousDayMinutesBefore);
      console.log('[END] Adding Notification to Event: %s (%s)', event.summary, start.toLocaleString());
    }
  }
}
