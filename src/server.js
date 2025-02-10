const app = require("./app");
const { config, utils } = require("common-utils");
const { envConfig } = config;
const { dbConnection } = utils;

const { PORT } = envConfig;

// Initialize the application
const initializeApp = async () => {
  try {
    // Connect to database
    await dbConnection.connect();

    // Start server only after DB connection is established
    app.listen(PORT, () => {
      console.log(`Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
};

initializeApp();
