"use strict";
// express.js is a web framework.

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
// Initialize app engine
const app = express();

// General middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: [process.env.FRONT_URL,"http://localhost:5173"]}));

module.exports = app;
