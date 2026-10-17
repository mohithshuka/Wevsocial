import { Request, Response } from "express";

const STUB_EVENTS = [
  { id: "evt-1", title: "Community Meetup", date: "2026-09-01T18:00:00.000Z" },
  { id: "evt-2", title: "Founders Breakfast", date: "2026-09-05T08:00:00.000Z" },
];

/** Events mini app is a stub per spec: registered, mountable, returns static data. */
export async function listEvents(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: STUB_EVENTS });
}
