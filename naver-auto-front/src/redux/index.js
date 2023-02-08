// reducers/index.js
import { combineReducers } from "redux";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

import userData from "./userData";

const persistConfig = {
  key: "root",
  // localStorage에 저장합니다.
  storage,
  // auth, board, studio 3개의 reducer 중에 auth reducer만 localstorage에 저장합니다.
  whitelist: ["userData"],
  // blacklist -> 그것만 제외합니다
};

export const rootReducer = combineReducers({
  userData,
});

export default persistReducer(persistConfig, rootReducer);
