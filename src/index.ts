import express from "express";
import { requireUser } from "./middleware";
import requestRoutes from "./routes";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/requests", requireUser, requestRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OpsFlow running on port ${PORT}`));