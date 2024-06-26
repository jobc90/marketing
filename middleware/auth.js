const { User } = require("../models/User");

let auth = (req, res, next) => {
  // 클라이언트 쿠키에서 토큰 가져오기
  let token = req.cookies.hasVisited;

  // 토큰을 복호화 한후 일치하는 유저 찾기
  User.findByToken(token, (err, user) => {
    if (err) throw err;
    if (!user) return res.json({ isAuth: false, error: true });

    req.token = token;
    req.user = user;
    next();
  });
};
module.exports = { auth };
