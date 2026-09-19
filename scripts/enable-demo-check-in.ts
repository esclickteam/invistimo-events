import dbConnect from "../lib/db";
import Event from "../models/Event";
import Invitation from "../models/Invitation";
import { ensureCheckInTokensForEvent } from "../lib/checkIn/ensureEventTokens";

/**
 * Enable Invistimo Check-in only on the current demo event.
 * Never enables all events.
 */
async function main() {
  await dbConnect();

  const demoInvitation =
    (await Invitation.findOne({
      $or: [
        { shareId: /demo/i },
        { title: /דמו|demo|לדוגמה/i },
      ],
    })
      .select("_id title shareId eventId")
      .sort({ updatedAt: -1 })
      .lean()) || null;

  let event =
    demoInvitation?.eventId
      ? await Event.findById(demoInvitation.eventId)
      : await Event.findOne({
          $or: [{ title: /דמו|demo|לדוגמה/i }, { name: /דמו|demo|לדוגמה/i }],
        }).sort({ updatedAt: -1 });

  if (!event) {
    console.log("NO_DEMO_EVENT");
    process.exit(2);
  }

  event.checkInEnabled = true;
  await event.save();
  const ensured = await ensureCheckInTokensForEvent(event._id);

  console.log(
    JSON.stringify(
      {
        ok: true,
        eventId: String(event._id),
        invitationId: demoInvitation?._id ? String(demoInvitation._id) : null,
        title: event.title || demoInvitation?.title || null,
        tokensCreated: ensured.tokensCreated,
      },
      null,
      2
    )
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
