const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
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

const users = require("./routes/users");
const controller = require("./routes/puppeteerController");
const mongo = require("./routes/mongoDb");

app.use("/api/users", users);
app.use("/controller", controller);
app.use("/mongo", mongo);

app.use(express.static(path.join(__dirname, "marketing-front/build")));

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "/react-project/build/index.html"));
});

const PORT = 3002;
app.listen(PORT, function () {
  console.log(`listening on ${PORT}`);
});

mongoose
  .connect(config.mongoURI, {
    dbName: "naverAuto",
  })
  .then(() => console.log("MongoDB 연결 성공..."))
  .catch((err) => console.log(err));
