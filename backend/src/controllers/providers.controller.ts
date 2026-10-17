import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { distanceMeters } from "../utils/geo";

/**
 * Geo Privacy: real coordinates NEVER leave the process. Only the
 * pre-computed `obfuscatedLat/obfuscatedLng` (stored at seed time via
 * obfuscateCoordinates) are serialized in the response. Distance sorting is
 * performed on the obfuscated points, matching the spec exactly.
 */
export async function listProviders(req: Request, res: Response): Promise<void> {
  const { lat, lng } = req.query;
  const providers = await prisma.provider.findMany();

  const shaped = providers.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    bio: p.bio,
    location: { lat: p.obfuscatedLat, lng: p.obfuscatedLng },
  }));

  if (typeof lat === "string" && typeof lng === "string") {
    const origin = { lat: Number(lat), lng: Number(lng) };
    shaped.sort(
      (a, b) =>
        distanceMeters(origin, a.location) - distanceMeters(origin, b.location)
    );
  }

  res.status(200).json({ data: shaped });
}

export async function getProvider(req: Request, res: Response): Promise<void> {
  const provider = await prisma.provider.findUnique({ where: { id: req.params.id } });
  if (!provider) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Provider not found" } });
    return;
  }
  res.status(200).json({
    data: {
      id: provider.id,
      name: provider.name,
      category: provider.category,
      bio: provider.bio,
      location: { lat: provider.obfuscatedLat, lng: provider.obfuscatedLng },
    },
  });
}
