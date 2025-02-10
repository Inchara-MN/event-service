const express = require("express");
const v1Routes = require("./v1");

const router = express.Router();

router.get("/health", (req, res) =>
  res.sendSuccess({ message: "Event service is healthy" })
);

router.use("/v1", v1Routes);

module.exports = router;
