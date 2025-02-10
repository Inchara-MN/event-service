const express = require("express");

const router = express.Router();
const eventRoutes = require("./event.routes");
const productRoutes = require("./product.routes");
const categoryRoutes = require("./category.routes");

router.get("/health", (req, res) =>
  res.sendSuccess({ message: "v1 of Event service is healthy" })
);

router.use("/events", eventRoutes);
router.use("/product", productRoutes);
router.use("/category", categoryRoutes);
module.exports = router;
