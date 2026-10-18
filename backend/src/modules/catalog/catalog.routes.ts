import { Router } from "express";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../../utils/asyncHandler";
import { getMongoDb } from "../../config/mongo";
import { redis } from "../../config/redis";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { ApiError } from "../../utils/apiError";

const router = Router();
const CACHE_KEY = "test_catalog:active";
const CACHE_TTL_SECONDS = 300;

router.get("/", asyncHandler(async (_req, res) => {
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    return res.json({ tests: JSON.parse(cached), cached: true });
  }

  const tests = await getMongoDb()
    .collection("test_catalog")
    .find({ is_active: true }, { projection: { _id: 0, id: 1, name: 1, category: 1, description: 1, price: 1, sample_type: 1, turnaround_hours: 1 } })
    .sort({ category: 1, name: 1 })
    .toArray();

  await redis.set(CACHE_KEY, JSON.stringify(tests), "EX", CACHE_TTL_SECONDS);
  res.json({ tests, cached: false });
}));

router.post("/", authenticate, requireRole("admin"), asyncHandler(async (req, res) => {
  const { name, category, description, price, sample_type, turnaround_hours } = req.body;
  if (!name || !price) {
    throw ApiError.badRequest("Name and price are required");
  }

  const newTest = {
    id: uuid(),
    name,
    category: category || "General",
    description: description || "",
    price: Number(price),
    sample_type: sample_type || "Blood",
    turnaround_hours: Number(turnaround_hours) || 12,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await getMongoDb().collection("test_catalog").insertOne(newTest);
  await redis.del(CACHE_KEY);

  res.status(201).json({ test: newTest });
}));

router.patch("/:id", authenticate, requireRole("admin"), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates: Record<string, unknown> = { updated_at: new Date() };

  if (typeof req.body.is_active === "boolean") updates.is_active = req.body.is_active;
  if (req.body.price !== undefined) updates.price = Number(req.body.price);
  if (req.body.name) updates.name = req.body.name;
  if (req.body.category) updates.category = req.body.category;
  if (req.body.description) updates.description = req.body.description;
  if (req.body.turnaround_hours !== undefined) updates.turnaround_hours = Number(req.body.turnaround_hours);

  const result = await getMongoDb().collection("test_catalog").findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after" }
  );

  const updatedTest = (result as any)?.value ?? result;
  if (!updatedTest) throw ApiError.notFound("Test not found in catalog");

  await redis.del(CACHE_KEY);
  res.json({ test: updatedTest });
}));

export default router;
