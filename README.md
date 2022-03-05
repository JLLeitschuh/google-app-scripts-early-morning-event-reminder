# Google App Scripts Early Morning Event Reminder

A Google App Script that adds notification reminders for the previous day when you have early events.

I missed an early morning appointment one day because I forgot to check my calendar the night before.

This script will, for meetings before 9:00 AM, automatically add a push reminder for the night before at 11:00 PM.

## End User Notes

You may need to change the `"timeZone": "America/New_York",` in `appsscript.json` to your timezone.
