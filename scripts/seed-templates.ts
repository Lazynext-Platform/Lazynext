import { db } from "../apps/web/src/db";
import { projects } from "../apps/web/src/db/schema";

const templates = [
  {
    id: "tpl_youtube_vlogger",
    name: "YouTube Vlogger Pack",
    crdtState: JSON.stringify({ tracks: [{ type: "video" }, { type: "audio", name: "Lofi Beats" }] }),
    ownerId: "system",
  },
  {
    id: "tpl_tiktok_hook",
    name: "TikTok Viral Hook",
    crdtState: JSON.stringify({ tracks: [{ type: "video" }, { type: "effect", name: "Auto-Captions" }] }),
    ownerId: "system",
  }
];

async function seed() {
  console.log("Seeding Lazynext Templates...");
  
  for (const tpl of templates) {
    await db.insert(projects).values({
      id: tpl.id,
      name: tpl.name,
      crdtState: tpl.crdtState,
      userId: tpl.ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
    console.log(`[Inserted] Template: ${tpl.name}`);
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch(console.error);
