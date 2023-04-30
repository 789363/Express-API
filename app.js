"use strict";

// Load configs from .env
(() => {
    const {existsSync} = require("fs");
    const {join: pathJoin} = require("path");
    const dotenvPath = pathJoin(__dirname, ".env");
    if (!existsSync(dotenvPath) && !process.env.APP_CONFIGURED) {
        throw new Error(".env not exists");
    }
    require("dotenv").config();
})();

// Create context storage
const ctx = {
    sequelize: require("./src/init/database"),
};

// Initialize application
const app = require("./src/init/express");
// Map routes
[
    require("./src/controllers/role"),
    require("./src/controllers/account"),
    require("./src/controllers/form"),
    require("./src/controllers/question"),
    require("./src/controllers/option"),
    require("./src/controllers/record")
].forEach((c) => c(ctx, app));

// Initialize role account
const initData = require("./src/init/init_data");
initData(ctx);

// Start application
app.listen(
    process.env.HTTP_PORT || 3000,
    process.env.HTTP_HOST || "0.0.0.0",
    () => console.info("Server boot successful"),
    
);
