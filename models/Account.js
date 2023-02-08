const mongoose = require("mongoose");

const {
  Types: { ObjectId },
} = mongoose.Schema; // ObjectId 타입은 따로 꺼내주어야 한다.
const accountSchema = mongoose.Schema({
  user: {
    type: ObjectId,
    required: true, // null 여부
    ref: "User",
  },
  id: {
    type: String,
    required: true, // null 여부
  },
  password: {
    type: String, // Int32가 아니다. 기본 자바스크립트에는 존재하지 않으니 넘버로 해줘야 한다.
    required: true,
  },
  commerce: {
    type: String,
    required: true,
  },
});

const Account = mongoose.model("Account", accountSchema);

module.exports = { Account };
