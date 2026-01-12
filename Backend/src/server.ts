//queries
import { db } from "./db";
import { users } from "./schema";

export async function getUsers() {
  return await db.select().from(users);
}

//routes
import express from "express";
import { getUsers } from "../db/queries/users";

const router = express.Router();

router.get("/users", async (req, res) => {
  const data = await getUsers();
  res.json(data);
});

export default router;

