const router = require("express").Router();
const { auth } = require("../middleware/auth");
const { User } = require("../models/User");

//api
router.post("/register", (req, res) => {
  const user = new User(req.body);

  user.save((err, userInfo) => {
    return err
      ? res.json({ success: false, err })
      : res.status(200).json({ success: true, userInfo: userInfo });
  });
});

router.post("/login", (req, res) => {
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

router.get("/auth", auth, (req, res) => {
  res.status(200).json({
    _id: req.user._id,
    email: req.user.email,
    name: req.user.name,
    title: req.user.title,
    isAuth: true,
  });
});

router.get("/logout", auth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id }, { token: "" }, (err, user) => {
    if (err) return res.json({ success: false, err });
    return res.status(200).send({
      success: true,
      logout: "로그 아웃 완료",
    });
  });
});

module.exports = router;
