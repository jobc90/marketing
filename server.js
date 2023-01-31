const express = require("express");
const path = require("path");
const app = express();
const { User } = require("./models/User");

const mongoose = require("mongoose");
const config = require("./config/key");
const { auth } = require("./middleware/auth");

const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
var cors = require("cors");
app.use(cors());

app.use(express.static(path.join(__dirname, "naver-auto-front/build")));

//api
app.post("/api/users/register", (req, res) => {
  const user = new User(req.body);

  user.save((err, userInfo) => {
    return err
      ? res.json({ success: false, err })
      : res.status(200).json({ success: true, userInfo: userInfo });
  });
});

app.post("/api/users/login", (req, res) => {
  // DB에서 요청한 Email 찾기
  User.findOne({ email: req.body.email }, (err, user) => {
    if (!user) {
      return res.json({
        loginSuccess: false,
        message: "email을 다시 확인하세요.",
      });
    }
    // DB에서 요청한 Email이 있다면 비밀번호가 같은지 확인
    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch)
        return res.json({
          loginSuccess: false,
          message: "비밀번호가 틀렸습니다",
        });
      // 비밀 번호가 같다면 Token 생성
      user.generateToken((err, user) => {
        if (err) return res.status(400).send(err);
        // 생성된 토큰을 쿠키에 저장
        res
          .cookie("hasVisited", user.token)
          .status(200)
          .json({ loginSuccess: true, userId: user._id });
      });
    });
  });
});

app.get("/api/users/auth", auth, (req, res) => {
  res.status(200).json({
    _id: req.user._id,
    email: req.user.email,
    name: req.user.name,
    title: req.user.title,
    isAuth: true,
  });
});

app.get("/api/users/logout", auth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id }, { token: "" }, (err, user) => {
    if (err) return res.json({ success: false, err });
    return res.status(200).send({
      success: true,
      logout: "로그 아웃 완료",
    });
  });
});

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "/react-project/build/index.html"));
});

app.listen(80, function () {
  console.log("listening on 80");
});

mongoose
  .connect(config.mongoURI)
  .then(() => console.log("MongoDB 연결 성공..."))
  .catch((err) => console.log(err));
