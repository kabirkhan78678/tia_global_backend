const adminEventsService = require('./src/modules/admin/events/admin.events.service');

async function main() {
  try {
    console.log('Testing createEvent...');
    const result = await adminEventsService.createEvent({
      title: "Annual Science Fair",
      description: "Science exhibition for primary school students.",
      eventDate: "2026-08-15",
      eventTime: "10:00:00",
      categories: ["STUDENT", "PARENT"],
      grades: ["1st Grade", "2nd Grade", "3rd Grade"]
    });
    console.log('Create result:', result);

    console.log('\nFetching newly created event details:');
    const event = await adminEventsService.getEventById(result.eventId);
    console.log(JSON.stringify(event, null, 2));

  } catch (error) {
    console.error('Error during testing:', error);
  }
}

main();
