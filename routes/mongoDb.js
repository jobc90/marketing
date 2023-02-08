const router = require("express").Router();
const { Item } = require("../models/Item");
const { Account } = require("../models/Account");
const { auth } = require("../middleware/auth");

router.get("/items/:id", auth, async (req, res) => {
  try {
    const items = await Item.find({ user: req.params.id });
    return res.json({ success: true, items });
  } catch (err) {
    return res.json({ success: false, err });
  }
});

router.post("/item", auth, async (req, res) => {
  const item = new Item(req.body);
  item.save((err, itemInfo) => {
    return err
      ? res.json({ success: false, err })
      : res.status(200).json({ success: true, itemInfo: itemInfo });
  });
});

router.get("/account/:id", auth, async (req, res) => {
  try {
    const account = await Account.find({ user: req.params.id });
    return res.json({ success: true, account });
  } catch (err) {
    return res.json({ success: false, err });
  }
});

router.post("/account", auth, async (req, res) => {
  // const account = new Account(req.body);
  // account.save((err, accountInfo) => {
  //   return err
  //     ? res.json({ success: false, err })
  //     : res.status(200).json({ success: true, accountInfo: accountInfo });
  // });
  const filter = { user: req.body.user, commerce: req.body.commerce };
  const update = { id: req.body.id, password: req.body.password };

  let accountInfo = await Account.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
  });
  return res.status(200).json({ success: true, accountInfo: accountInfo });
});
module.exports = router;
