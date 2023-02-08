const mongoose = require("mongoose");

const {
  Types: { ObjectId },
} = mongoose.Schema; // ObjectId 타입은 따로 꺼내주어야 한다.
const itemSchema = mongoose.Schema({
  user: {
    type: ObjectId,
    required: true, // null 여부
    ref: "User",
  },
  itemName: {
    type: String,
    required: true, // null 여부
  },
  code: {
    type: String, // Int32가 아니다. 기본 자바스크립트에는 존재하지 않으니 넘버로 해줘야 한다.
    required: true,
  },
  url: {
    type: String,
    required: true, // null 여부
  },
});

const Item = mongoose.model("Item", itemSchema);

module.exports = { Item };
