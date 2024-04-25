const express = require("express");
const path = require("path");
const config = require("./config/key");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var cors = require("cors");
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
//brower
const browserController = require("./browser-controller");
browserController.initBrowsers();

const controller = require("./routes/puppeteerController");

app.use("/controller", controller);

const PORT = 3002;
app.listen(PORT, function () {
  console.log(`listening on ${PORT}`);
});
