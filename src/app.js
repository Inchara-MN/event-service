const express = require("express");
const { middlewares } = require("common-utils");
const { loggerMiddleware, responseMiddleware, errorHandlingMiddleware } =
  middlewares;
const cors = require("cors");
const helmet = require("helmet");
const apiRoutes = require("./routes");

const app = express();

// Global middlewares
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(loggerMiddleware);
app.use(responseMiddleware);

// TODO: Add routes here
app.use(apiRoutes);
// Error handling middleware (must be after the routes)
app.use(errorHandlingMiddleware);

module.exports = app;
