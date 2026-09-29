import express from "express";
import { auth } from "./auth";
import router from "./routes";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/requests", auth, router);

export default app;