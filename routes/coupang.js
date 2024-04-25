const express = require("express");
const router = express.Router();
const browserController = require("../../browser-controller");
const connect = require("../../database-Connect");
const path = require("path");
const fs = require("fs");
var FormData = require("form-data");
const axios = require("axios");

const jobCodePreparation = 300;
const jobCodeRegisteration = 301;
const jobCodeAuthCheck = 302;
const jobCodePurchaseSafety = 303;
const jobCodeSellerJoin = 304;
const jobCodeFinish = 305;
const jobCodeAccountAbleCheck = 310;
const jobCodeOneClickJoin = 306;

router.post("/test", async (req, res, next) => {
  const userData = await connect.getUserData(req.body.tenantId);

  console.log(userData);
  res.sendStatus(200);
});

router.post("/coupangAccountAbleCheck", async (req, res) => {
  const params = req.body;
  const userData = await connect.getUserData(req.body.tenantId);
  const hashCode = req.body.hashCode;
  const tenantId = req.body.tenantId;

  const COUPANG_ID = params.coupangId;
  const COUPANG_PASSWORD = params.coupangPassword;

  const browser = await browserController.getBrowser(hashCode);
  if (browser == null) {
    res.status(400).send({ error: "user hashCode error" });
    connect.unuseBrowser(hashCode, tenantId, jobCodeAccountAbleCheck, {
      error: "user hashCode error",
    });
    return;
  }
  const coupangPages = await browser.pages();
  const coupangPage = coupangPages[0];
  const loginAuthCode = params.loginAuthCode;

  try {
    if (loginAuthCode.length !== 6) {
      await coupangPage.goto("https://wing.coupang.com", {
        waitUntil: "networkidle2",
      });
      await coupangPage.waitForTimeout(500);
      async function loginCheck(coupangPage) {
        const hamburger = await coupangPage.$(
          "#top-header-menu > div.top-header-control.hamburger"
        );
        if (!hamburger) {
          const userId = await coupangPage.waitForSelector(
            "input.account-input.user-id.cp-loginpage__form__input--block.requirement"
          );
          await userId.type(COUPANG_ID);
          const userPw = await coupangPage.waitForSelector("input#password");
          await userPw.type(COUPANG_PASSWORD);
          await coupangPage.click("input.cp-loginpage__form__submit");
        }
      }
      await loginCheck(coupangPage);
      await coupangPage.waitForNavigation();
      const loginResultMessageEle = await coupangPage.$("span#input-error");
      console.log("loginResultMessageEle", loginResultMessageEle);
      if (loginResultMessageEle) {
        res.status(400).send({
          message: "아이디 또는 비밀번호가 다릅니다.",
          code: 400,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeAccountAbleCheck, {
          message: "아이디 또는 비밀번호가 다릅니다.",
          code: 400,
        });
        return;
      } else if (coupangPage.url().includes(`wing.coupang.com`)) {
        res.status(200).send({
          message: "로그인 성공",
          code: 200,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeAccountAbleCheck, {
          message: "로그인 성공",
          code: 200,
        });
      }
    }
  } catch (error) {
    console.error("로그인 과정에서 에러발생.", error);
    res.status(500).send({ error: error });
    connect.unuseBrowser(hashCode, tenantId, jobCodeAccountAbleCheck, {
      error: error,
      message: "로그인 과정에서 에러발생.",
      code: 400,
    });
    return;
  }

  try {
    let isAuthCheckedFlag = false;

    const hamburger = await coupangPage.$(
      "#top-header-menu > div.top-header-control.hamburger"
    );
    console.log(hamburger);
    if (hamburger) {
      //햄버거가 있으면 추가인증없이 로그인 완료 후 대시보드 이동
      isAuthCheckedFlag = true;
    } else if (loginAuthCode.length == 6) {
      //유저가 authCode를 입력했다면 authCode입력 후 인증
      const authCodeInput = await coupangPage.waitForSelector("#auth-mfa-code");
      await authCodeInput.type(loginAuthCode.toString());
      await coupangPage.click("#mfa-submit");
      await coupangPage.waitForTimeout(5000);
      const newHamburger = await coupangPage.$(
        "#top-header-menu > div.top-header-control.hamburger"
      );
      console.log(1);

      if (newHamburger) {
        //햄버거가 있으면 추가인증없이 로그인 완료 후 대시보드 이동
        isAuthCheckedFlag = true;
        console.log(2);
      } else {
        res.send({ message: "인증번호를 다시 입력해주세요." });
        connect.unuseBrowser(hashCode, tenantId, jobCodeAccountAbleCheck, {
          message: "인증번호를 다시 입력해주세요.",
          code: 302,
        });
        console.log(2);
        return;
      }
    } else {
      //햄버거가 없고, authCode도 없으면 인증번호 입력대기
      await coupangPage.waitForSelector("#btnSms");
      await coupangPage.click("#btnSms");
      await coupangPage.waitForSelector("#auth-mfa-code"); //인증번호 입력요소를 기다리고
      const element = await coupangPage.$("#auth-mfa-code");
      if (element) {
        res.send({ message: "인증번호를 입력해주세요." });
        connect.unuseBrowser(hashCode, tenantId, jobCodeAccountAbleCheck, {
          message: "인증번호를 입력해주세요.",
          code: 301,
        });
        return;
      }
    }
  } catch (error) {
    console.error("인증체크 과정에서 에러발생.", error);
    res.status(500).send({ error: error });
    connect.unuseBrowser(hashCode, tenantId, jobCodeAccountAbleCheck, {
      error: error,
      message: "인증체크 과정에서 에러발생.",
      code: 500,
    });
    return;
  }
});

router.post("/coupangPreparation", async (req, res) => {
  const browser = await browserController.getBrowser(req.body.hashCode);
  if (browser == null) {
    res.status(400).send({ error: "user hashCode error" });
    return;
  }
  const coupangPages = await browser.pages();
  const coupangPage = coupangPages[0];
  // 쿠팡윙 이동후 대기
  try {
    await coupangPage.goto(
      "https://wing.coupang.com/tenants/vendor-signup/signup",
      {
        waitUntil: "networkidle2",
      }
    );
  } catch (error) {
    console.error("쿠팡 가입페이지 이동중 에러 발생함.", error);
    res.status(500).send({ error: error });
    return;
  }

  res.sendStatus(200);
});

router.post("/coupangRegisteration", async (req, res) => {
  const params = req.body;
  const userData = await connect.getUserData(req.body.tenantId);
  const hashCode = req.body.hashCode;
  const tenantId = req.body.tenantId;

  const NAME = connect.findValue(userData, "name");
  const EMAIL = connect.findValue(userData, "email");
  // const PHONE_NUMBER = connect.findValue(userData, "phone_number");

  const browser = await browserController.getBrowser(hashCode);
  if (browser == null) {
    res.status(400).send({
      message: "user hashCode error",
      error: "user hashCode error",
      code: 151,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
      message: "user hashCode error",
      error: "user hashCode error",
      code: 151,
    });
    return;
  }
  const coupangPages = await browser.pages();
  const coupangPage = coupangPages[0];

  //아이디 비밀번호 입력 & 검사
  try {
    await coupangPage.waitForSelector(
      "#main > div:nth-child(5) > div > div.input_style > div:nth-child(1) > div > input"
    );

    //6~20자의 영문 소문자, 숫자와 특수문자(_, -, .)만 사용 가능(프론트에서 유효성검사 필요)
    const coupangId = await coupangPage.$(
      "#main > div:nth-child(5) > div > div > div:nth-child(1) > div > input"
    );
    await coupangId.type(params.coupangId + "/");
    const coupangPassword = await coupangPage.$(
      "#main > div:nth-child(7) > div > div > div:nth-child(1) > div > input"
    );
    await coupangPassword.type(params.coupangPassword);
    const coupangPasswordCheck = await coupangPage.$(
      "#main > div:nth-child(9) > div > div > div:nth-child(1) > div > input"
    );
    await coupangPasswordCheck.type(params.coupangPassword);
  } catch (error) {
    console.error("아이디 비밀번호 입력 중 에러 발생함.", error);
    res.status(500).send({
      message: "아이디 비밀번호 입력 중 에러 발생함.",
      error: error,
      code: 152,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
      message: "아이디 비밀번호 입력 중 에러 발생함.",
      error: error,
      code: 152,
    });
    return;
  }

  //가입정보 입력
  try {
    const userName = await coupangPage.$(
      "#main > div:nth-child(11) > div > div > div:nth-child(1) > div > input"
    );
    await userName.type(NAME + "/");
    const userEmail = await coupangPage.$(
      "#main > div:nth-child(13) > div > div > div:nth-child(1) > div > input"
    );
    await userEmail.type(EMAIL);
    const userPhone = await coupangPage.$(
      "#main > div:nth-child(15) > div > div.input_mobile > div > input"
    );
    // await userPhone.type(PHONE_NUMBER.replace(/-/g, ""));
    await userPhone.type(params.coupangMobile.replace(/-/g, ""));
  } catch (error) {
    console.error("개인정보 입력 중 에러 발생함.", error);
    res.status(500).send({
      message: "개인정보 입력 중 에러 발생함.",
      error: error,
      code: 153,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
      message: "개인정보 입력 중 에러 발생함.",
      error: error,
      code: 153,
    });
    return;
  }

  //비즈니스 형태 선택
  //브랜드 오너/제조사 -> 제조사
  //위탁 판매 -> 위탁
  //매입 판매 -> 매입
  //해외직구/병행수입 -> 해외
  try {
    const selectSelector = "#business-type-dropdown > select";
    if (params.coupangBusinessType === "제조사") {
      const optionValueToSelect = "MANUFACTURER";
      await coupangPage.select(selectSelector, optionValueToSelect);
    } else if (params.coupangBusinessType === "위탁") {
      const optionValueToSelect = "DROP_SHIPPING";
      await coupangPage.select(selectSelector, optionValueToSelect);
    } else if (params.coupangBusinessType === "매입") {
      const optionValueToSelect = "RESELLER";
      await coupangPage.select(selectSelector, optionValueToSelect);
    } else if (params.coupangBusinessType === "해외") {
      const optionValueToSelect = "OVERSEA_DELIVERY";
      await coupangPage.select(selectSelector, optionValueToSelect);
    } else {
      console.error("비즈니스 형태선택에서 에러 발생함.", error);
      res.status(500).send({
        message: "비즈니스 형태선택에서 에러 발생함.",
        error: error.toString(),
        code: 154,
      });
      connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
        message: "비즈니스 형태선택에서 에러 발생함.",
        error: error.toString(),
        code: 154,
      });
      return;
    }
    await coupangPage.evaluate(() => {
      document.querySelector("#agree-all").click();
    });
  } catch (error) {
    console.error("비즈니스 형태선택에서 에러 발생함.", error);
    res.status(500).send({
      message: "비즈니스 형태선택에서 에러 발생함.",
      error: error.toString(),
      code: 154,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
      message: "비즈니스 형태선택에서 에러 발생함.",
      error: error.toString(),
      code: 154,
    });
    return;
  }
  try {
    const coupangId = await coupangPage.$(
      "#main > div:nth-child(5) > div > div > div:nth-child(1) > div > input"
    );
    await coupangId.press("Backspace");
    const userName = await coupangPage.$(
      "#main > div:nth-child(11) > div > div > div:nth-child(1) > div > input"
    );
    await userName.press("Backspace");
    await coupangPage.waitForTimeout(500);
    await coupangPage.click(
      "#main > div:nth-child(15) > div > div.input_mobile > div.input-mobile-container > input"
    );
    await coupangPage.waitForTimeout(1000);
  } catch (error) {
    console.error("아이디 입력 중 에러 발생함.", error);
    res.status(500).send({
      message: "아이디 입력 중 에러 발생함.",
      error: error,
      code: 155,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
      message: "아이디 입력 중 에러 발생함.",
      error: error,
      code: 155,
    });
    return;
  }

  try {
    async function checkError(coupangPage) {
      const element = await coupangPage.$(
        "#main > div:nth-child(5) > div > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > i > svg"
      );
      if (element) {
        await coupangPage.reload({
          waitUntil: ["domcontentloaded", "networkidle0"],
        });
        res.send({
          message: "이미 사용중인 아이디 입니다.",
          data: null,
          code: 101,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
          message: "이미 사용중인 아이디 입니다.",
          data: null,
          code: 101,
        });
        coupangPage.off("framenavigated");
      } else {
        await coupangPage.waitForSelector(
          "#main > div:nth-child(15) > div > div:nth-child(2) > button"
        );
        await coupangPage.evaluate(() => {
          document
            .querySelector(
              "#main > div:nth-child(15) > div > div:nth-child(2) > button"
            )
            .click();
        });
        res.send({
          message: "인증번호 발송 완료(아이디 인증 완료)",
          data: null,
          code: 200,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeFinish, {
          message: "인증번호 발송 완료(아이디 인증 완료)",
          data: null,
          code: 200,
        });
      }
    }
    await checkError(coupangPage);
  } catch (error) {
    console.error("아이디 확인과정에서 에러 발생함.", error);
    res.status(500).send({
      message: "아이디 확인과정에서 에러 발생함.",
      error: error,
      code: 156,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
      message: "아이디 확인과정에서 에러 발생함.",
      error: error,
      code: 156,
    });
    return;
  }
});

router.post("/coupangAuthCheck", async (req, res) => {
  const params = req.body;
  const hashCode = req.body.hashCode;
  const tenantId = req.body.tenantId;

  const browser = await browserController.getBrowser(hashCode);
  if (browser == null) {
    res.status(400).send({
      message: "user hashCode error",
      error: "user hashCode error",
      code: 251,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
      message: "user hashCode error",
      error: "user hashCode error",
      code: 251,
    });
    return;
  }
  const coupangPages = await browser.pages();
  const coupangPage = coupangPages[0];
  try {
    //인증번호 입력
    const registerAuthCode = await coupangPage.$(
      "#main > div:nth-child(16) > div > div:nth-child(1) > div.input_style > div.input-div > div > input"
    );
    await registerAuthCode.type(params.registerAuthCode);
    //인증확인 버튼
    await coupangPage.evaluate(() => {
      document
        .querySelector(
          "#main > div:nth-child(16) > div > div:nth-child(1) > div:nth-child(2) > button"
        )
        .click();
    });
    await coupangPage.waitForTimeout(1000);
  } catch (error) {
    console.error("인증번호 입력 에러 발생함.", error);
    res.status(500).send({
      message: "인증번호 입력 에러 발생함.",
      error: error,
      code: 252,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
      message: "인증번호 입력 에러 발생함.",
      error: error,
      code: 252,
    });
    return;
  }

  try {
    async function checkError(coupangPage) {
      const usedPhone = await coupangPage.$(
        "#main > div:nth-child(15) > div.error-text"
      );
      const authCodeError = await coupangPage.$(
        "#main > div:nth-child(16) > div > div.error-text"
      );
      // 사용중인 번호일때 인증요청 다시 보내기
      if (usedPhone) {
        const message = await coupangPage.evaluate(
          (el) => el.textContent,
          usedPhone
        );
        if (
          message ===
          "이미 사용중인 휴대폰번호입니다. 확인 후 다시 인증해주세요."
        ) {
          res.send({
            message:
              "이미 사용중인 휴대폰번호입니다. 확인 후 다시 인증해주세요.",
            data: null,
            code: 201,
          });
          connect.unuseBrowser(hashCode, tenantId, jobCodeAuthCheck, {
            message:
              "이미 사용중인 휴대폰번호입니다. 확인 후 다시 인증해주세요.",
            data: null,
            code: 201,
          });
          await coupangPage.reload({
            waitUntil: ["domcontentloaded", "networkidle0"],
          });
          coupangPage.off("framenavigated");
        }
      } else if (authCodeError) {
        // 인증번호 오류
        const message = await coupangPage.evaluate(
          (el) => el.textContent,
          authCodeError
        );
        // 인증번호 틀렸을 때 인증번호만 다시 입력
        if (message === "인증번호가 일치하지 않습니다. 다시 입력해주세요.") {
          const authCodeInput = await coupangPage.$(
            "#main > div:nth-child(16) > div > div:nth-child(1) > div.input_style > div.input-div > div > input"
          );
          await authCodeInput.click({ clickCount: 3 });
          await authCodeInput.press("Backspace");
          coupangPage.off("framenavigated");
          res.send({
            message: "인증번호가 일치하지 않습니다. 다시 입력해주세요.",
            data: null,
            code: 202,
          });
          connect.unuseBrowser(hashCode, tenantId, jobCodeAuthCheck, {
            message: "인증번호가 일치하지 않습니다. 다시 입력해주세요.",
            data: null,
            code: 202,
          });
          // 인증시간 초과시 재요청
        } else if (
          message ===
          "인증코드 입력허용시간이 경과되었습니다. 인증요청을 다시 해주세요."
        ) {
          await coupangPage.evaluate(() => {
            document
              .querySelector(
                "#main > div:nth-child(15) > div > div:nth-child(2) > button"
              )
              .click();
          });
          const authCodeInput = await coupangPage.$(
            "#main > div:nth-child(16) > div > div:nth-child(1) > div.input_style > div.input-div > div > input"
          );
          await authCodeInput.click({ clickCount: 3 });
          await authCodeInput.press("Backspace");
          coupangPage.off("framenavigated");
          res.send({
            message:
              "인증코드 입력허용시간이 경과되었습니다. 인증요청을 다시 해주세요.",
            data: null,
            code: 203,
          });
          connect.unuseBrowser(hashCode, tenantId, jobCodeAuthCheck, {
            message:
              "인증코드 입력허용시간이 경과되었습니다. 인증요청을 다시 해주세요.",
            data: null,
            code: 203,
          });
        }
      } else {
        await coupangPage.waitForSelector("#main > div:nth-child(21) > button");
        await coupangPage.evaluate(() => {
          document.querySelector("#main > div:nth-child(21) > button").click();
        });
        //인증완료 후 다음 페이지로 넘어감
        res.send({
          message: "인증이 완료되었습니다.",
          data: null,
          code: 200,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodePurchaseSafety, {
          message: "인증이 완료되었습니다.",
          data: null,
          code: 200,
        });
        connect.insertNovaData(tenantId, "coupang_id", params.coupangId);
        connect.insertNovaData(
          tenantId,
          "coupang_password",
          params.coupangPassword
        );
        connect.insertNovaData(
          tenantId,
          "coupang_business_type",
          params.coupangBusinessType
        );
        connect.insertNovaData(
          tenantId,
          "coupang_mobile",
          params.coupangMobile
        );
      }
    }
    await checkError(coupangPage);
  } catch (error) {
    console.error("인증과정에서 에러 발생함.", error);
    res.status(500).send({
      message: "인증과정에서 에러 발생함.",
      error: error,
      code: 253,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeAuthCheck, {
      message: "인증과정에서 에러 발생함.",
      error: error,
      code: 253,
    });
    return;
  }
});

router.post("/coupangPurchaseSafety", async (req, res) => {
  const params = req.body;
  const userData = await connect.getUserData(req.body.tenantId);
  const hashCode = req.body.hashCode;
  const tenantId = req.body.tenantId;

  const NAME = connect.findValue(userData, "name");
  const COUPANG_ID = connect.findValue(userData, "coupang_id");
  const COUPANG_PASSWORD = connect.findValue(userData, "coupang_password");

  const BUSINESS_TITLE = connect.findValue(userData, "company_name");
  const BUSINESS_NUMBER = connect.findValue(
    userData,
    "company_registration_number"
  );
  const BUSINESS_ADDRESS = connect.findValue(userData, "business_address");
  const BUSINESS_DETAIL_ADDRESS = connect.findValue(
    userData,
    "business_detail_address"
  );

  const browser = await browserController.getBrowser(hashCode);
  if (browser == null) {
    res.status(400).send({
      message: "user hashCode error",
      error: "user hashCode error",
      code: 351,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
      message: "user hashCode error",
      error: "user hashCode error",
      code: 351,
    });
    return;
  }
  const coupangPages = await browser.pages();
  const coupangPage = coupangPages[0];
  const loginAuthCode = params.loginAuthCode;

  try {
    if (loginAuthCode.length !== 6) {
      await coupangPage.goto("https://wing.coupang.com", {
        waitUntil: "networkidle2",
      });
      await coupangPage.waitForTimeout(500);
      // 301->302->303으로 왔는지(로그인 되어있음), 303으로 바로 왔는지(로그인 필요) 확인가능
      // 로그인 여부 체크
      async function loginCheck(coupangPage) {
        const hamburger = await coupangPage.$(
          "#top-header-menu > div.top-header-control.hamburger"
        );
        if (!hamburger) {
          const userId = await coupangPage.waitForSelector(
            "input.account-input.user-id.cp-loginpage__form__input--block.requirement"
          );
          await userId.click({ clickCount: 3 });
          await userId.type(COUPANG_ID);
          const userPw = await coupangPage.waitForSelector("input#password");
          await userPw.type(COUPANG_PASSWORD);
          await coupangPage.click("input.cp-loginpage__form__submit");
          await coupangPage.waitForTimeout(2000);
          const loginError = await coupangPage.$("#input-error");
          if (!loginError) {
            // 로그인 에러가 없으면 계정 유효
          } else {
            // 로드인 에러가 있으면 계정 확인 필요
            res.send({
              message:
                "아이디 또는 비밀번호가 다릅니다. 확인 후 다시 입력해주세요.",
              data: null,
              code: 301,
            });
            connect.unuseBrowser(hashCode, tenantId, jobCodePurchaseSafety, {
              message:
                "아이디 또는 비밀번호가 다릅니다. 확인 후 다시 입력해주세요.",
              data: null,
              code: 301,
            });
            return;
          }
        }
      }
      await loginCheck(coupangPage);
      await coupangPage.waitForTimeout(2000);
    }
  } catch (error) {
    console.error("로그인 과정에서 에러발생.", error);
    res.status(500).send({
      message: "로그인 과정에서 에러발생.",
      error: error,
      code: 352,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodePurchaseSafety, {
      message: "로그인 과정에서 에러발생.",
      error: error,
      code: 352,
    });
    return;
  }

  try {
    let isAuthCheckedFlag = false;

    const hamburger = await coupangPage.$(
      "#top-header-menu > div.top-header-control.hamburger"
    );
    if (hamburger) {
      //햄버거가 있으면 추가인증없이 로그인 완료 후 대시보드 이동
      isAuthCheckedFlag = true;
    } else if (loginAuthCode.length == 6) {
      //유저가 authCode를 입력했다면 authCode입력 후 인증
      const authCodeInput = await coupangPage.waitForSelector("#auth-mfa-code");
      await authCodeInput.type(loginAuthCode.toString());
      await coupangPage.click("#mfa-submit");
      await coupangPage.waitForTimeout(2000);
      const newHamburger = await coupangPage.$(
        "#top-header-menu > div.top-header-control.hamburger"
      );
      console.log(1);

      if (newHamburger) {
        //햄버거가 있으면 추가인증없이 로그인 완료 후 대시보드 이동
        isAuthCheckedFlag = true;
        console.log(2);
      } else {
        res.send({
          message: "인증번호가 올바르지 않습니다. 다시 입력해주세요.",
          data: null,
          code: 302,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodePurchaseSafety, {
          message: "인증번호가 올바르지 않습니다. 다시 입력해주세요.",
          data: null,
          code: 302,
        });
        console.log(2);
        return;
      }
    } else {
      //햄버거가 없고, authCode도 없으면 인증번호 입력대기
      await coupangPage.waitForSelector("#btnSms");
      await coupangPage.click("#btnSms");
      await coupangPage.waitForSelector("#auth-mfa-code"); //인증번호 입력요소를 기다리고
      const element = await coupangPage.$("#auth-mfa-code");
      if (element) {
        res.send({
          message: "인증번호를 보냈습니다. 인증번호를 입력해주세요.",
          data: null,
          code: 201,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
          message: "인증번호를 보냈습니다. 인증번호를 입력해주세요.",
          data: null,
          code: 201,
        });
        return;
      }
    }
  } catch (error) {
    console.error("인증체크 과정에서 에러발생.", error);
    res.status(500).send({
      message: "로그인(또는 인증번호 입력 후)체크 과정에서 에러발생.",
      error: error,
      code: 353,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "로그인(또는 인증번호 입력 후)체크 과정에서 에러발생.",
      error: error,
      code: 353,
    });
    return;
  }

  try {
    await coupangPage.waitForTimeout(1000);
    const transSelect = await coupangPage.waitForSelector(
      "select.wing-top-main-footer-locale-selector"
    );
    await transSelect.select("ko");
    const transSelectPopup = await coupangPage.waitForSelector(
      "button.wing-layout-btn-primary.wing-modal-confirm-trigger"
    );
    await coupangPage.evaluate(() =>
      document
        .querySelector(
          "button.wing-layout-btn-primary.wing-modal-confirm-trigger"
        )
        .click()
    );
    try {
      async function findADPopup(coupangPage) {
        await coupangPage.waitForSelector(
          "#container-wing-v2 > div.wing-notify-popup.sc-common-text > div:nth-child(2) > div:nth-child(2) > button"
        );
        const element = await coupangPage.$(
          "#container-wing-v2 > div.wing-notify-popup.sc-common-text > div:nth-child(2) > div:nth-child(2) > button"
        );
        if (element) {
          await coupangPage.evaluate(() => {
            document
              .querySelector(
                "#container-wing-v2 > div.wing-notify-popup.sc-common-text > div:nth-child(2) > div:nth-child(2) > button"
              )
              .click();
          });
        } else {
          await findADPopup(coupangPage);
        }
      }
      await findADPopup(coupangPage);
    } catch (error) {
      console.error("팝업창 닫기 에러발생.", error);
      res.status(500).send({
        message: "언어변환 후 팝업창 닫기에서 에러발생.",
        error: error,
        code: 354,
      });
      connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
        message: "언어변환 후 팝업창 닫기에서 에러발생.",
        error: error,
        code: 354,
      });
      return;
    }

    await coupangPage.waitForTimeout(500);
    const gotoSeller = await coupangPage.waitForSelector(
      "#dashboard-card-WingOnboardingSellerEntry > div > button"
    );
    await coupangPage.evaluate(() =>
      document
        .querySelector(
          "#dashboard-card-WingOnboardingSellerEntry > div > button"
        )
        .click()
    );
    await coupangPage.waitForTimeout(500);
  } catch (error) {
    console.error(
      "인증체크 후 판매자 정보입력페이지로 이동중 에러발생..",
      error
    );
    res.status(500).send({
      message: "인증체크 후 판매자 정보입력페이지로 이동중 에러발생.",
      error: error,
      code: 355,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "인증체크 후 판매자 정보입력페이지로 이동중 에러발생.",
      error: error,
      code: 355,
    });
    return;
  }

  try {
    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(2) > div > dl > dd > span > span > input"
    );
    await coupangPage.waitForTimeout(1000);
    const businessNumber = await coupangPage.$(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(2) > div > dl > dd > span > span > input"
    );
    const inputBusinessNumber = await coupangPage.evaluate(
      (businessNumber) => businessNumber.value,
      businessNumber
    );
    // 사업자번호가 입력이 안되어있는 경우와 사업자번호가 인증되어 있는 경우 체크
    if (inputBusinessNumber.length !== 10) {
      // 계정은 있지만 사업자번호가 입력이 안되어있는 경우
      await businessNumber.click({ clickCount: 3 });
      await businessNumber.type(BUSINESS_NUMBER);
      await coupangPage.evaluate(() =>
        document
          .querySelector(
            ".wing-web-component.business-section button:nth-child(2)"
          )
          .click()
      );
      await coupangPage.waitForTimeout(2000);
      try {
        let businessNumberCheckFlag = false;
        async function businessNumberCheck(coupangPage) {
          const element = await coupangPage.$(
            "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(2) > div > dl > dd > span > span.wing-web-component"
          );
          const message = await coupangPage.evaluate(
            (el) => el.textContent,
            element
          );
          if (element) {
            // 인증번호 틀렸을 때 인증번호만 다시 입력
            console.log(message);
            if (message === "인증완료\n        ") {
              businessNumberCheckFlag = true;
            } else if (message === "숫자로만 입력해주세요\n        ") {
              // 사업자번호 잘못 입력된 경우
              console.log("1번에러");
              await coupangPage.evaluate(() => {
                document
                  .querySelector(
                    "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(2) > button"
                  )
                  .click();
              });
              res.send({
                message:
                  "유효하지 않은 사업자등록번호입니다. 고객센터에 문의해 주세요.",
                data: null,
                code: 303,
              });
              connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
                message:
                  "유효하지 않은 사업자등록번호입니다. 고객센터에 문의해 주세요.",
                data: null,
                code: 303,
              });
              await coupangPage.reload({
                waitUntil: ["domcontentloaded", "networkidle0"],
              });
              coupangPage.off("framenavigated");
              return;
            } else if (message === "인증해주세요.\n        ") {
              // 사업자번호 이미 사용중인 경우
              console.log("2번에러");
              await coupangPage.evaluate(() => {
                document
                  .querySelector(
                    "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(2) > button"
                  )
                  .click();
              });
              res.send({
                message:
                  "해당 사업자 번호는 이미 가입이 되어있습니다. 고객센터에 문의해 주세요.",
                data: null,
                code: 304,
              });
              connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
                message:
                  "해당 사업자 번호는 이미 가입이 되어있습니다. 고객센터에 문의해 주세요.",
                data: null,
                code: 304,
              });
              await coupangPage.reload({
                waitUntil: ["domcontentloaded", "networkidle0"],
              });
              coupangPage.off("framenavigated");
              return;
            } else {
              console.error("사업자번호 입력 에러 발생함.", error);
              res.status(500).send({
                message: "사업자번호 입력에서 에러 발생함.",
                error: error,
                code: 356,
              });
              connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
                message: "사업자번호 입력에서 에러 발생함.",
                error: error,
                code: 356,
              });
              return;
            }
          } else {
            await businessNumberCheck(coupangPage);
          }
        }
        await businessNumberCheck(coupangPage);
        if (businessNumberCheckFlag === false) {
          return;
        }
      } catch (error) {
        console.error("사업자번호 인증 에러 발생함.", error);
        res.status(500).send({
          message: "사업자번호 인증에서 에러 발생함.",
          error: error,
          code: 357,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
          message: "사업자번호 인증에서 에러 발생함.",
          error: error,
          code: 357,
        });
        return;
      }
    } else {
      let businessNumberCheckFlag = false;
      // 사업자번호가 인증이 되어 있는 경우
      if (inputBusinessNumber == BUSINESS_NUMBER) {
        // 인증된 사업자번호가 DB에 있는 사업자번호와 같은 경우
        // -> 처리가능
        businessNumberCheckFlag = true;
      } else {
        // 인증된 사업자번호와 DB에 있는 사업자 번호와 다르거나 잘못된 값이 입력된 경우
        // -> 처리불가
        res.send({
          message: "등록된 사업자정보와 일치하지 않는 사업자 입니다.",
          data: null,
          code: 305,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
          message: "등록된 사업자정보와 일치하지 않는 사업자 입니다.",
          data: null,
          code: 305,
        });
        await coupangPage.reload({
          waitUntil: ["domcontentloaded", "networkidle0"],
        });
        coupangPage.off("framenavigated");
        return;
      }
    }

    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(1) > dt > span"
    );
    let innerText = await coupangPage.$eval(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(1) > dt > span",
      (element) => {
        return element.innerText;
      }
    );
    let plusIdx = 0;

    if (innerText === "대표구성") {
      plusIdx = 1;
    }

    await coupangPage.waitForSelector(
      `#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(${
        1 + plusIdx
      }) > dd > span > span > span > span > span > input[type=text]`
    );
    const CEOName = await coupangPage.$(
      `#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(${
        1 + plusIdx
      }) > dd > span > span > span > span > span > input[type=text]`
    );
    await CEOName.click({ clickCount: 3 });
    await CEOName.type(NAME);
    await coupangPage.waitForSelector(
      `#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(${
        3 + plusIdx
      }) > dd > span > span > span > span > span > input[type=text]`
    );
    const businessTitle = await coupangPage.$(
      `#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(${
        3 + plusIdx
      }) > dd > span > span > span > span > span > input[type=text]`
    );
    await businessTitle.click({ clickCount: 3 });
    await businessTitle.type(BUSINESS_TITLE);
    await coupangPage.waitForTimeout(500);
    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(4) > div > dl:nth-child(1) > dd > button"
    );
    await coupangPage.evaluate(() =>
      document
        .querySelector(
          "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(4) > div > dl:nth-child(1) > dd > button"
        )
        .click()
    );
    await coupangPage.waitForTimeout(500);

    // 쿠팡주소검색 api는 split없이 모든주소 입력가능 -> split code 주석처리
    // // 주소 입력 팝업
    // const addressParts = BUSINESS_ADDRESS.replace(/\([^)]*\)/g, "")
    //   .trim()
    //   .split(" ");
    // var addressHeader;
    // var addressBody;

    // if (addressParts.length == 4) {
    //   addressHeader = addressParts[2]; //도로명
    //   addressBody = addressParts[3]; //건물번호
    // } else if (addressParts.length == 5) {
    //   addressHeader = addressParts[3]; //도로명
    //   addressBody = addressParts[4]; //건물번호
    // }

    try {
      const elementHandle = await coupangPage.$(
        'iframe[src="https://id.coupang.com/zipcode/roadname?isMobile=true&returnUrl=https://wing.coupang.com/tenants/vendor-signup/joining/steps/basic-info/postal-code/foward"]'
      );
      const frame = await elementHandle.contentFrame();
      await frame.waitForSelector(
        "body > section > div.zipcode__wrapper > div > div > header > div > form > div.zipcode__keyword-box._zipcodeSearchKeyBox > input"
      );
      const businessAddressInput = await frame.$(
        "body > section > div.zipcode__wrapper > div > div > header > div > form > div.zipcode__keyword-box._zipcodeSearchKeyBox > input"
      );
      await businessAddressInput.type(BUSINESS_ADDRESS);
      await frame.waitForTimeout(500);
      await frame.waitForSelector(
        "body > section > div.zipcode__wrapper > div > div > header > div > form > div.zipcode__search-trigger > button"
      );
      await frame.evaluate(() =>
        document
          .querySelector(
            "body > section > div.zipcode__wrapper > div > div > header > div > form > div.zipcode__search-trigger > button"
          )
          .click()
      );
      await frame.waitForTimeout(500);
      await frame.waitForSelector(
        "body > section > div.zipcode__wrapper > div > div > div > div.zipcode__slide-view._zipcodeResultSlideRoot > div.zipcode__slide-track._zipcodeResultSlide > div.zipcode__slide-item.zipcode__slide-item--address._zipcodeResultSlideItem > div._zipcodeResultListAddress > div:nth-child(1) > span.zipcode__result__item.zipcode__result__item--road._zipcodeResultSendTrigger > span.zipcode__result__text.zipcode__result__text--address"
      );
      await frame.evaluate(() =>
        document
          .querySelector(
            "body > section > div.zipcode__wrapper > div > div > div > div.zipcode__slide-view._zipcodeResultSlideRoot > div.zipcode__slide-track._zipcodeResultSlide > div.zipcode__slide-item.zipcode__slide-item--address._zipcodeResultSlideItem > div._zipcodeResultListAddress > div:nth-child(1) > span.zipcode__result__item.zipcode__result__item--road._zipcodeResultSendTrigger > span.zipcode__result__text.zipcode__result__text--address"
          )
          .click()
      );
      await coupangPage.waitForSelector(
        "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(4) > div > dl:nth-child(3) > dd > span > span > span > span > span > input[type=text]"
      );
      const addressDetailInputDiv = await coupangPage.$(
        "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(4) > div > dl:nth-child(3) > dd > span > span > span > span > span > input[type=text]"
      );
      await addressDetailInputDiv.click({ clickCount: 3 });
      await addressDetailInputDiv.type(BUSINESS_DETAIL_ADDRESS);
    } catch (error) {
      console.error("사업자 정보 입력중 에러발생.", error);
      res.status(500).send({
        message: "사업자 정보 입력중 에러 발생함.",
        error: error,
        code: 358,
      });
      connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
        message: "사업자 정보 입력중 에러 발생함.",
        error: error,
        code: 358,
      });
      return;
    }
  } catch (error) {
    console.error("사업자 정보 입력중 에러발생.", error);
    res.status(500).send({
      message: "사업자 정보 입력중 에러 발생함.",
      error: error,
      code: 358,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "사업자 정보 입력중 에러 발생함.",
      error: error,
      code: 358,
    });
    return;
  }
  //산업은행 020
  //기업은행 030
  //국민은행 040
  //외환은행 050
  //수협은행 070
  //농협은행 110
  //농협은행(단위조합) 120
  //우리은행 200
  //SC제일은행 230
  //씨티은행 530
  //대구은행 310
  //부산은행 320
  //광주은행 340
  //제주은행 350
  //전북은행 370
  //경남은행 390
  //새마을금고 840
  //신협은행 048
  //우체국 710
  //하나은행 810
  //신한은행 260
  //케이뱅크 089
  //카카오뱅크 090
  //토스뱅크 092
  //HSBC H10
  try {
    const bankSelector =
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(1) > dd > select";
    if (params.bankType === "산업은행") {
      const optionValueToSelect = "020";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "기업은행") {
      const optionValueToSelect = "030";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "국민은행") {
      const optionValueToSelect = "040";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "외환은행") {
      const optionValueToSelect = "050";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "수협은행") {
      const optionValueToSelect = "070";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "농협은행") {
      const optionValueToSelect = "110";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "농협은행(단위조합)") {
      const optionValueToSelect = "120";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "우리은행") {
      const optionValueToSelect = "200";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "SC제일은행") {
      const optionValueToSelect = "230";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "씨티은행") {
      const optionValueToSelect = "530";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "대구은행") {
      const optionValueToSelect = "310";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "부산은행") {
      const optionValueToSelect = "320";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "광주은행") {
      const optionValueToSelect = "340";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "제주은행") {
      const optionValueToSelect = "350";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "전북은행") {
      const optionValueToSelect = "370";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "경남은행") {
      const optionValueToSelect = "390";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "새마을금고") {
      const optionValueToSelect = "840";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "신협은행") {
      const optionValueToSelect = "048";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "우체국") {
      const optionValueToSelect = "710";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "하나은행") {
      const optionValueToSelect = "810";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "신한은행") {
      const optionValueToSelect = "260";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "케이뱅크") {
      const optionValueToSelect = "089";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "카카오뱅크") {
      const optionValueToSelect = "090";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "토스뱅크") {
      const optionValueToSelect = "092";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "HSBC") {
      const optionValueToSelect = "H10";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else {
      throw new Error("은행을 확인해 주세요.");
    }
    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(2) > dd > span:nth-child(1) > span > span > span > span > input[type=text]"
    );
    const bankUsername = await coupangPage.$(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(2) > dd > span:nth-child(1) > span > span > span > span > input[type=text]"
    );
    await bankUsername.click({ clickCount: 3 });
    await bankUsername.type(params.bankUsername);
    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(2) > dd > span:nth-child(2) > span > span > span > span > input[type=text]"
    );
    const bankAccountNumber = await coupangPage.$(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(2) > dd > span:nth-child(2) > span > span > span > span > input[type=text]"
    );
    await bankAccountNumber.click({ clickCount: 3 });
    await bankAccountNumber.type(params.bankAccountNumber);
    await coupangPage.waitForSelector(
      ".business-section > dl:nth-child(2) > dd > button"
    );
    await coupangPage.evaluate(() =>
      document
        .querySelector(".business-section > dl:nth-child(2) > dd > button")
        .click()
    );
    await coupangPage.waitForTimeout(3000);

    //계좌인증 분기처리
    try {
      async function waitAccountCheck(coupangPage) {
        const element = await coupangPage.$(
          "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(3) > dd > span"
        );
        if (element) {
          const message = await coupangPage.evaluate(
            (el) => el.textContent,
            element
          );
          console.log(message);
          //계좌인증의 성공메세지를 받았을때만 다음 단계로 이동
          //성공메세지의 유효성 확인
          if (
            message ===
            "\n          인증이 완료되었습니다. 통장사본을 첨부해주시기 바랍니다.\n       "
          ) {
            //파일 다운로드 세팅
            const downloadPath = path.resolve("./purchase_safety_file/");
            let guids = {};

            const client = await coupangPage.target().createCDPSession();
            await client.send("Browser.setDownloadBehavior", {
              behavior: "allowAndName",
              downloadPath: downloadPath,
              eventsEnabled: true,
            });

            client.on("Browser.downloadWillBegin", async (event) => {
              //some logic here to determine the filename
              //the event provides event.suggestedFilename and event.url
              guids[event.guid] = tenantId + ".pdf";
            });

            client.on("Browser.downloadProgress", async (event) => {
              // when the file has been downloaded, locate the file by guid and rename it
              if (event.state === "completed") {
                fs.renameSync(
                  path.resolve(downloadPath, event.guid),
                  path.resolve(downloadPath, guids[event.guid])
                );
              }
            });

            await coupangPage.waitForSelector(
              "#main > div.main-content > div:nth-child(5) > div.wuic-border > div > dl > dt > div > span.wing-web-component > input[type=checkbox]"
            );
            await coupangPage.evaluate(() => {
              document
                .querySelector(
                  "#main > div.main-content > div:nth-child(5) > div.wuic-border > div > dl > dt > div > span.wing-web-component > input[type=checkbox]"
                )
                .click();
            });
            await coupangPage.waitForSelector(
              "#main > div.main-content > div.business-seller-footer > button.wing-web-component.secondary-btn"
            );
            const saveTemporary = await coupangPage.$(
              "#main > div.main-content > div.business-seller-footer > button.wing-web-component.secondary-btn"
            );
            // 임시저장
            if (process.env.FINAL_SUMMIT === "true" ? true : false) {
              await coupangPage.evaluate(() => {
                document
                  .querySelector(
                    "#main > div.main-content > div.business-seller-footer > button.wing-web-component.secondary-btn"
                  )
                  .click();
              });

              await coupangPage.waitForTimeout(1000);
              await coupangPage.waitForSelector(
                "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(5) > div > dl:nth-child(2) > dd > div:nth-child(4) > button"
              );
              const purchaseSafety = await coupangPage.$(
                "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(5) > div > dl:nth-child(2) > dd > div:nth-child(4) > button"
              );
              await coupangPage.evaluate(() => {
                document
                  .querySelector(
                    "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(5) > div > dl:nth-child(2) > dd > div:nth-child(4) > button"
                  )
                  .click();
              });

              const filePath = path.resolve(
                `./purchase_safety_file/${tenantId}.pdf`
              );
              await waitFile(filePath);
              const formData = new FormData();
              formData.append("image", fs.createReadStream(filePath));
              formData.append("tenant_id", tenantId);
              formData.append("key", "purchase_safety_report");

              const apiUrl = "https://snapshop.kr/api/snap/imageStore"; // API 엔드포인트 URL
              const headers = {
                ...formData.getHeaders(), // FormData 헤더 정보
                // 다른 요청 헤더도 필요한 경우 추가
              };

              axios.post(apiUrl, formData, { headers }).then((response) => {
                console.log("서버 응답:", response.data);
                res.send({
                  message: "구매안전서비스 이용 확인증을 다운받았습니다.",
                  data: null,
                  code: 200,
                });
                connect.unuseBrowser(hashCode, tenantId, jobCodeSellerJoin, {
                  message: "구매안전서비스 이용 확인증을 다운받았습니다.",
                  data: null,
                  code: 200,
                });
                connect.insertNovaData(
                  tenantId,
                  "coupang_bank_type",
                  params.bankType
                );
                connect.insertNovaData(
                  tenantId,
                  "coupang_bank_username",
                  params.bankUsername
                );
                connect.insertNovaData(
                  tenantId,
                  "coupang_bank_account_number",
                  params.bankAccountNumber
                );
              });
            } else {
              res.send({
                message: "구매안전서비스 이용 확인증을 다운받았습니다.",
                data: null,
                code: 200,
              });
              connect.unuseBrowser(hashCode, tenantId, jobCodeSellerJoin, {
                message: "구매안전서비스 이용 확인증을 다운받았습니다.",
                data: null,
                code: 200,
              });
            }
          } else {
            //계좌인증 성공메세지는 받았으나 유효성 검사 실패시 에러처리 -> 페이지 새로고침
            res.send({
              message: "예금주명과 상호명(또는 대표자명)이 일치하지 않습니다.",
              data: null,
              code: 306,
            });
            await coupangPage.reload({
              waitUntil: ["domcontentloaded", "networkidle0"],
            });
            coupangPage.off("framenavigated");
            connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
              message: "예금주명과 상호명(또는 대표자명)이 일치하지 않습니다.",
              data: null,
              code: 306,
            });
          }
        } else {
          //실패메세지 받으면 에러처리 -> 페이지 새로고침
          const errorCheck = await coupangPage.$(
            "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(3) > dd > div > p"
          );
          if (errorCheck) {
            const message2 = await coupangPage.evaluate(
              (el) => el.textContent,
              errorCheck
            );
            res.send({
              message:
                "유효하지 않은 계좌(또는 이름)입니다. 확인 후 다시 입력하세요.",
              data: null,
              code: 307,
            });
            await coupangPage.reload({
              waitUntil: ["domcontentloaded", "networkidle0"],
            });
            coupangPage.off("framenavigated");
            connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
              message:
                "유효하지 않은 계좌(또는 이름)입니다. 확인 후 다시 입력하세요.",
              data: null,
              code: 307,
            });
          } else {
            //성공메세지나 실패메세지 둘 다 받지못하면 계좌인증 결과메세지 다시 확인하기
            await waitAccountCheck(coupangPage);
          }
        }
      }
      await waitAccountCheck(coupangPage);
    } catch (error) {
      console.error("계좌확인에서 에러 발생함.", error);
      res.status(500).send({
        message: "계좌확인에서 에러 발생함.",
        error: error,
        code: 359,
      });
      connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
        message: "계좌확인에서 에러 발생함.",
        error: error,
        code: 359,
      });
      return;
    }
  } catch (error) {
    console.error("은행 입력에서 에러 발생함.", error);
    res.status(500).send({
      message: "은행 입력에서 에러 발생함.",
      error: error,
      code: 360,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "은행 입력에서 에러 발생함.",
      error: error,
      code: 360,
    });
    return;
  }
});

router.post("/coupangSellerJoin", async (req, res) => {
  const params = req.body;
  const userData = await connect.getUserData(req.body.tenantId);
  const hashCode = req.body.hashCode;
  const tenantId = req.body.tenantId;

  const COUPANG_ID = connect.findValue(userData, "coupang_id");
  const COUPANG_PASSWORD = connect.findValue(userData, "coupang_password");
  const MAIL_ORDER_BUSINESS_NUMBER = connect.findValue(
    userData,
    "mail_order_business_number"
  );

  const BUSINESS_REGISTRATION = connect.findValue(
    userData,
    "business_registration"
  );

  const COUPANG_BANK_PASSBOOK = connect.findValue(
    userData,
    "coupang_bank_passbook"
  );

  const MAIL_ORDER_BUSINESS_REPORT = connect.findValue(
    userData,
    "mail_order_business_report"
  );

  const browser = await browserController.getBrowser(hashCode);
  if (browser == null) {
    res.status(400).send({
      message: "user hashCode error",
      error: "user hashCode error",
      code: 451,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeRegisteration, {
      message: "user hashCode error",
      error: "user hashCode error",
      code: 451,
    });
    return;
  }
  const coupangPages = await browser.pages();
  const coupangPage = coupangPages[0];
  const loginAuthCode = params.loginAuthCode;

  try {
    if (loginAuthCode.length !== 6) {
      await coupangPage.goto("https://wing.coupang.com", {
        waitUntil: "networkidle2",
      });
      await coupangPage.waitForTimeout(500);
      // 301->302->303으로 왔는지, 303으로 바로 왔는지 확인
      // 로그인 여부 체크
      async function loginCheck(coupangPage) {
        const hamburger = await coupangPage.$(
          "#top-header-menu > div.top-header-control.hamburger"
        );
        if (!hamburger) {
          const userId = await coupangPage.waitForSelector(
            "input.account-input.user-id.cp-loginpage__form__input--block.requirement"
          );
          await userId.click({ clickCount: 3 });
          await userId.type(COUPANG_ID);
          const userPw = await coupangPage.waitForSelector("input#password");
          await userPw.type(COUPANG_PASSWORD);
          await coupangPage.click("input.cp-loginpage__form__submit");
          await coupangPage.waitForTimeout(2000);
          const loginError = await coupangPage.$("#input-error");
          if (!loginError) {
            // 로그인 에러가 없으면 계정 유효
          } else {
            // 로드인 에러가 있으면 계정 확인 필요
            res.send({
              message:
                "아이디 또는 비밀번호가 다릅니다. 확인 후 다시 입력해주세요.",
              data: null,
              code: 401,
            });
            connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
              message:
                "아이디 또는 비밀번호가 다릅니다. 확인 후 다시 입력해주세요.",
              data: null,
              code: 401,
            });
            return;
          }
        }
      }
      await loginCheck(coupangPage);
      await coupangPage.waitForTimeout(2000);
    }
  } catch (error) {
    console.error("로그인 과정에서 에러발생.", error);
    res.status(500).send({
      message: "로그인 과정에서 에러발생.",
      error: error,
      code: 452,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "로그인 과정에서 에러발생.",
      error: error,
      code: 452,
    });
    return;
  }

  try {
    let isAuthCheckedFlag = false;

    const hamburger = await coupangPage.$(
      "#top-header-menu > div.top-header-control.hamburger"
    );
    if (hamburger) {
      //햄버거가 있으면 추가인증없이 로그인 완료 후 대시보드 이동
      isAuthCheckedFlag = true;
    } else if (loginAuthCode.length == 6) {
      //유저가 authCode를 입력했다면 authCode입력 후 인증
      const authCodeInput = await coupangPage.waitForSelector("#auth-mfa-code");
      await authCodeInput.type(loginAuthCode.toString());
      await coupangPage.click("#mfa-submit");
      await coupangPage.waitForTimeout(2000);
      const newHamburger = await coupangPage.$(
        "#top-header-menu > div.top-header-control.hamburger"
      );
      console.log(1);

      if (newHamburger) {
        //햄버거가 있으면 추가인증없이 로그인 완료 후 대시보드 이동
        isAuthCheckedFlag = true;
        console.log(2);
      } else {
        res.send({
          message: "인증번호가 올바르지 않습니다. 다시 입력해주세요.",
          data: null,
          code: 402,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
          message: "인증번호가 올바르지 않습니다. 다시 입력해주세요.",
          data: null,
          code: 402,
        });
        console.log(2);
        return;
      }
    } else {
      //햄버거가 없고, authCode도 없으면 인증번호 입력대기
      await coupangPage.waitForSelector("#btnSms");
      await coupangPage.click("#btnSms");
      await coupangPage.waitForSelector("#auth-mfa-code"); //인증번호 입력요소를 기다리고
      const element = await coupangPage.$("#auth-mfa-code");
      if (element) {
        res.send({
          message: "인증번호를 보냈습니다. 인증번호를 입력해주세요.",
          data: null,
          code: 201,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
          message: "인증번호를 보냈습니다. 인증번호를 입력해주세요.",
          data: null,
          code: 201,
        });
        return;
      }
    }
  } catch (error) {
    console.error("인증체크 과정에서 에러발생.", error);
    res.status(500).send({
      message: "로그인(또는 인증번호 입력 후)체크 과정에서 에러발생.",
      error: error,
      code: 453,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "로그인(또는 인증번호 입력 후)체크 과정에서 에러발생.",
      error: error,
      code: 453,
    });
    return;
  }

  try {
    await coupangPage.waitForTimeout(1000);
    const transSelect = await coupangPage.waitForSelector(
      "select.wing-top-main-footer-locale-selector"
    );
    await transSelect.select("ko");
    const transSelectPopup = await coupangPage.waitForSelector(
      "button.wing-layout-btn-primary.wing-modal-confirm-trigger"
    );
    await coupangPage.evaluate(() =>
      document
        .querySelector(
          "button.wing-layout-btn-primary.wing-modal-confirm-trigger"
        )
        .click()
    );
    try {
      async function findADPopup(coupangPage) {
        await coupangPage.waitForSelector(
          "#container-wing-v2 > div.wing-notify-popup.sc-common-text > div:nth-child(2) > div:nth-child(2) > button"
        );
        const element = await coupangPage.$(
          "#container-wing-v2 > div.wing-notify-popup.sc-common-text > div:nth-child(2) > div:nth-child(2) > button"
        );
        if (element) {
          await coupangPage.evaluate(() => {
            document
              .querySelector(
                "#container-wing-v2 > div.wing-notify-popup.sc-common-text > div:nth-child(2) > div:nth-child(2) > button"
              )
              .click();
          });
        } else {
          await findADPopup(coupangPage);
        }
      }
      await findADPopup(coupangPage);
    } catch (error) {
      console.error("팝업창 닫기 에러발생.", error);
      res.status(500).send({
        message: "언어변환 후 팝업창 닫기에서 에러발생.",
        error: error,
        code: 454,
      });
      connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
        message: "언어변환 후 팝업창 닫기에서 에러발생.",
        error: error,
        code: 454,
      });
      return;
    }

    await coupangPage.waitForTimeout(500);
    const gotoSeller = await coupangPage.waitForSelector(
      "#dashboard-card-WingOnboardingSellerEntry > div > button"
    );
    await coupangPage.evaluate(() =>
      document
        .querySelector(
          "#dashboard-card-WingOnboardingSellerEntry > div > button"
        )
        .click()
    );
    await coupangPage.waitForTimeout(500);

    // 통신판매업 번호 입력
    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(5) > div > dl:nth-child(1) > dd > div > span > span > span > span > span > input[type=text]"
    );
    await coupangPage.waitForTimeout(1000);
    const mailBusinessNumber = await coupangPage.$(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(5) > div > dl:nth-child(1) > dd > div > span > span > span > span > span > input[type=text]"
    );
    await mailBusinessNumber.click({ clickCount: 3 });
    await mailBusinessNumber.type(MAIL_ORDER_BUSINESS_NUMBER);
    await coupangPage.waitForTimeout(500);

    // 약관 동의
    await coupangPage.waitForSelector(
      "#main > div.main-content > div:nth-child(5) > div.wuic-border > div > dl > dt > div > span.wing-web-component > input[type=checkbox]"
    );
    await coupangPage.evaluate(() => {
      document
        .querySelector(
          "#main > div.main-content > div:nth-child(5) > div.wuic-border > div > dl > dt > div > span.wing-web-component > input[type=checkbox]"
        )
        .click();
    });
    await coupangPage.waitForTimeout(1000);
  } catch (error) {
    console.error(
      "인증체크 후 판매자 정보입력페이지로 이동중 에러발생..",
      error
    );
    res.status(500).send({
      message: "인증체크 후 판매자 정보입력페이지로 이동중 에러발생.",
      error: error,
      code: 455,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "인증체크 후 판매자 정보입력페이지로 이동중 에러발생.",
      error: error,
      code: 455,
    });
    return;
  }

  try {
    await downloadImgFromUrl(
      "https://snapshop.kr/storage/" + tenantId + "/" + COUPANG_BANK_PASSBOOK,
      path.join(os.tmpdir(), COUPANG_BANK_PASSBOOK)
    );
    await downloadImgFromUrl(
      "https://snapshop.kr/storage/" + tenantId + "/" + BUSINESS_REGISTRATION,
      path.join(os.tmpdir(), BUSINESS_REGISTRATION)
    );
    await downloadImgFromUrl(
      "https://snapshop.kr/storage/" +
        tenantId +
        "/" +
        MAIL_ORDER_BUSINESS_REPORT,
      path.join(os.tmpdir(), MAIL_ORDER_BUSINESS_REPORT)
    );

    // 통장사본, 사업자등록증, 통신판매신고증 등록
    // const bankPassBookFilePath =
    //   "/home/ubuntu/mail-order-business-testcode/public/images/test.jpg";
    // const businessRegistrationFilePath =
    //   "/home/ubuntu/mail-order-business-testcode/public/images/test.jpg";
    // const mailOrderBusinessReportFilePath =
    //   "/home/ubuntu/mail-order-business-testcode/public/images/test.jpg";
    const bankPassBook = await coupangPage.$(
      '.business-section > dl:last-child input[type="file"]'
    );

    await bankPassBook.uploadFile(COUPANG_BANK_PASSBOOK);
    await coupangPage.waitForTimeout(500);
    const businessRegistration = await coupangPage.$(
      ".attach-file-section > div:nth-child(3) > dl:first-child > dd input[type='file']"
    );
    await businessRegistration.uploadFile(BUSINESS_REGISTRATION);
    await coupangPage.waitForTimeout(500);
    const mailOrderBusinessReport = await coupangPage.$(
      ".attach-file-section > div:nth-child(3) > dl:last-child > dd input[type='file']"
    );
    await mailOrderBusinessReport.uploadFile(MAIL_ORDER_BUSINESS_REPORT);
  } catch (error) {
    console.error("파일 업로드 에러.", error);
    res.status(500).send({
      message: "파일 업로드 에러.",
      error: error,
      code: 456,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "파일 업로드 에러.",
      error: error,
      code: 456,
    });
    return;
  }
  try {
    await coupangPage.waitForTimeout(500);

    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-footer > button.wing-web-component.primary-btn"
    );
    const submitCoupangSeller = await coupangPage.$(
      "#main > div.main-content > div.business-seller-footer > button.wing-web-component.primary-btn"
    );
    // 최종신고
    if (process.env.FINAL_SUMMIT === "true" ? true : false) {
      await coupangPage.evaluate(() => {
        document
          .querySelector(
            "#main > div.main-content > div.business-seller-footer > button.wing-web-component.primary-btn"
          )
          .click();
      });
    }
    await coupangPage.waitForTimeout(500);

    const finalError = await coupangPage.$(
      "#main > div.main-content > div:nth-child(8) > div > div:nth-child(1) > div:nth-child(2) > span"
    );
    if (finalError) {
      const message = await coupangPage.evaluate(
        (el) => el.textContent,
        finalError
      );
      res.send({
        message: "입력하지 않은 값이 있습니다. 입력란을 확인해 주세요.",
        data: null,
        code: 403,
      });
      await coupangPage.reload({
        waitUntil: ["domcontentloaded", "networkidle0"],
      });
      coupangPage.off("framenavigated");
      connect.unuseBrowser(hashCode, tenantId, jobCodeFinish, {
        message: "입력하지 않은 값이 있습니다. 입력란을 확인해 주세요.",
        data: null,
        code: 403,
      });
    } else {
      res.send({
        message: "쿠팡윙 사업자정보를 제출 완료하였습니다.",
        data: null,
        code: 200,
      });
      connect.unuseBrowser(hashCode, tenantId, jobCodeFinish, {
        message: "쿠팡윙 사업자정보를 제출 완료하였습니다.",
        data: null,
        code: 200,
      });
    }
  } catch (error) {
    console.error("최종 제출에서 에러.", error);
    res.status(500).send({
      message: "최종 제출에서 에러.",
      error: error,
      code: 457,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "최종 제출에서 에러.",
      error: error,
      code: 457,
    });
    return;
  }
});

router.post("/coupangOneClickJoin", async (req, res) => {
  const params = req.body;
  const userData = await connect.getUserData(req.body.tenantId);
  const hashCode = req.body.hashCode;
  const tenantId = req.body.tenantId;

  const NAME = connect.findValue(userData, "name");
  const COUPANG_ID = connect.findValue(userData, "coupang_id");
  const COUPANG_PASSWORD = connect.findValue(userData, "coupang_password");

  const BUSINESS_TITLE = connect.findValue(userData, "company_name");
  const BUSINESS_NUMBER = connect.findValue(
    userData,
    "company_registration_number"
  );
  const BUSINESS_ADDRESS = connect.findValue(userData, "business_address");
  const BUSINESS_DETAIL_ADDRESS = connect.findValue(
    userData,
    "business_detail_address"
  );
  const MAIL_ORDER_BUSINESS_NUMBER = connect.findValue(
    userData,
    "mail_order_business_number"
  );

  const BUSINESS_REGISTRATION = connect.findValue(
    userData,
    "business_registration"
  );

  const COUPANG_BANK_PASSBOOK = connect.findValue(
    userData,
    "coupang_bank_passbook"
  );

  const MAIL_ORDER_BUSINESS_REPORT = connect.findValue(
    userData,
    "mail_order_business_report"
  );

  const browser = await browserController.getBrowser(hashCode);
  if (browser == null) {
    res.status(400).send({
      message: "user hashCode error",
      error: "user hashCode error",
      code: 551,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "user hashCode error",
      error: "user hashCode error",
      code: 551,
    });
    return;
  }
  const coupangPages = await browser.pages();
  const coupangPage = coupangPages[0];
  const loginAuthCode = params.loginAuthCode;

  try {
    if (loginAuthCode.length !== 6) {
      await coupangPage.goto("https://wing.coupang.com", {
        waitUntil: "networkidle2",
      });
      await coupangPage.waitForTimeout(500);
      // 301->302->303으로 왔는지, 303으로 바로 왔는지 확인
      // 로그인 여부 체크
      async function loginCheck(coupangPage) {
        const hamburger = await coupangPage.$(
          "#top-header-menu > div.top-header-control.hamburger"
        );
        if (!hamburger) {
          const userId = await coupangPage.waitForSelector(
            "input.account-input.user-id.cp-loginpage__form__input--block.requirement"
          );
          await userId.click({ clickCount: 3 });
          await userId.type(COUPANG_ID);
          const userPw = await coupangPage.waitForSelector("input#password");
          await userPw.type(COUPANG_PASSWORD);
          await coupangPage.click("input.cp-loginpage__form__submit");
          await coupangPage.waitForTimeout(2000);
          const loginError = await coupangPage.$("#input-error");
          if (!loginError) {
            // 로그인 에러가 없으면 계정 유효
          } else {
            // 로드인 에러가 있으면 계정 확인 필요
            res.send({
              message:
                "아이디 또는 비밀번호가 다릅니다. 확인 후 다시 입력해주세요.",
              data: null,
              code: 501,
            });
            connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
              message:
                "아이디 또는 비밀번호가 다릅니다. 확인 후 다시 입력해주세요.",
              data: null,
              code: 501,
            });
            return;
          }
        }
      }
      await loginCheck(coupangPage);
      await coupangPage.waitForTimeout(2000);
    }
  } catch (error) {
    console.error("로그인 과정에서 에러발생.", error);
    res.status(500).send({
      message: "로그인 과정에서 에러발생.",
      error: error,
      code: 552,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "로그인 과정에서 에러발생.",
      error: error,
      code: 552,
    });
    return;
  }

  try {
    let isAuthCheckedFlag = false;

    const hamburger = await coupangPage.$(
      "#top-header-menu > div.top-header-control.hamburger"
    );
    if (hamburger) {
      //햄버거가 있으면 추가인증없이 로그인 완료 후 대시보드 이동
      isAuthCheckedFlag = true;
    } else if (loginAuthCode.length == 6) {
      //유저가 authCode를 입력했다면 authCode입력 후 인증
      const authCodeInput = await coupangPage.waitForSelector("#auth-mfa-code");
      await authCodeInput.type(loginAuthCode.toString());
      await coupangPage.click("#mfa-submit");
      await coupangPage.waitForTimeout(2000);
      const newHamburger = await coupangPage.$(
        "#top-header-menu > div.top-header-control.hamburger"
      );
      console.log(1);

      if (newHamburger) {
        //햄버거가 있으면 추가인증없이 로그인 완료 후 대시보드 이동
        isAuthCheckedFlag = true;
        console.log(2);
      } else {
        res.send({
          message: "인증번호가 올바르지 않습니다. 다시 입력해주세요.",
          data: null,
          code: 502,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
          message: "인증번호가 올바르지 않습니다. 다시 입력해주세요.",
          data: null,
          code: 502,
        });
        console.log(2);
        return;
      }
    } else {
      //햄버거가 없고, authCode도 없으면 인증번호 입력대기
      await coupangPage.waitForSelector("#btnSms");
      await coupangPage.click("#btnSms");
      await coupangPage.waitForSelector("#auth-mfa-code"); //인증번호 입력요소를 기다리고
      const element = await coupangPage.$("#auth-mfa-code");
      if (element) {
        res.send({
          message: "인증번호를 보냈습니다. 인증번호를 입력해주세요.",
          data: null,
          code: 201,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
          message: "인증번호를 보냈습니다. 인증번호를 입력해주세요.",
          data: null,
          code: 201,
        });
        return;
      }
    }
  } catch (error) {
    console.error("인증체크 과정에서 에러발생.", error);
    res.status(500).send({
      message: "로그인(또는 인증번호 입력 후)체크 과정에서 에러발생.",
      error: error,
      code: 553,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "로그인(또는 인증번호 입력 후)체크 과정에서 에러발생.",
      error: error,
      code: 553,
    });
    return;
  }

  try {
    await coupangPage.waitForTimeout(1000);
    const transSelect = await coupangPage.waitForSelector(
      "select.wing-top-main-footer-locale-selector"
    );
    await transSelect.select("ko");
    const transSelectPopup = await coupangPage.waitForSelector(
      "button.wing-layout-btn-primary.wing-modal-confirm-trigger"
    );
    await coupangPage.evaluate(() =>
      document
        .querySelector(
          "button.wing-layout-btn-primary.wing-modal-confirm-trigger"
        )
        .click()
    );
    try {
      async function findADPopup(coupangPage) {
        await coupangPage.waitForSelector(
          "#container-wing-v2 > div.wing-notify-popup.sc-common-text > div:nth-child(2) > div:nth-child(2) > button"
        );
        const element = await coupangPage.$(
          "#container-wing-v2 > div.wing-notify-popup.sc-common-text > div:nth-child(2) > div:nth-child(2) > button"
        );
        if (element) {
          await coupangPage.evaluate(() => {
            document
              .querySelector(
                "#container-wing-v2 > div.wing-notify-popup.sc-common-text > div:nth-child(2) > div:nth-child(2) > button"
              )
              .click();
          });
        } else {
          await findADPopup(coupangPage);
        }
      }
      await findADPopup(coupangPage);
    } catch (error) {
      console.error("팝업창 닫기 에러발생.", error);
      res.status(500).send({
        message: "언어변환 후 팝업창 닫기에서 에러발생.",
        error: error,
        code: 554,
      });
      connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
        message: "언어변환 후 팝업창 닫기에서 에러발생.",
        error: error,
        code: 554,
      });
      return;
    }

    await coupangPage.waitForTimeout(500);
    const gotoSeller = await coupangPage.waitForSelector(
      "#dashboard-card-WingOnboardingSellerEntry > div > button"
    );
    await coupangPage.evaluate(() =>
      document
        .querySelector(
          "#dashboard-card-WingOnboardingSellerEntry > div > button"
        )
        .click()
    );
    await coupangPage.waitForTimeout(500);
  } catch (error) {
    console.error(
      "인증체크 후 판매자 정보입력페이지로 이동중 에러발생..",
      error
    );
    res.status(500).send({
      message: "인증체크 후 판매자 정보입력페이지로 이동중 에러발생.",
      error: error,
      code: 555,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "인증체크 후 판매자 정보입력페이지로 이동중 에러발생.",
      error: error,
      code: 555,
    });
    return;
  }

  try {
    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(2) > div > dl > dd > span > span > input"
    );
    await coupangPage.waitForTimeout(1000);
    const businessNumber = await coupangPage.$(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(2) > div > dl > dd > span > span > input"
    );
    const inputBusinessNumber = await coupangPage.evaluate(
      (businessNumber) => businessNumber.value,
      businessNumber
    );
    // 사업자번호가 입력이 안되어있는 경우와 사업자번호가 인증되어 있는 경우 체크
    if (inputBusinessNumber.length !== 10) {
      // 계정은 있지만 사업자번호가 입력이 안되어있는 경우
      await businessNumber.click({ clickCount: 3 });
      await businessNumber.type(BUSINESS_NUMBER);
      await coupangPage.evaluate(() =>
        document
          .querySelector(
            ".wing-web-component.business-section button:nth-child(2)"
          )
          .click()
      );
      await coupangPage.waitForTimeout(2000);
      try {
        let businessNumberCheckFlag = false;
        async function businessNumberCheck(coupangPage) {
          const element = await coupangPage.$(
            "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(2) > div > dl > dd > span > span.wing-web-component"
          );
          const message = await coupangPage.evaluate(
            (el) => el.textContent,
            element
          );
          if (element) {
            // 인증번호 틀렸을 때 인증번호만 다시 입력
            console.log(message);
            if (message === "인증완료\n        ") {
              businessNumberCheckFlag = true;
            } else if (message === "숫자로만 입력해주세요\n        ") {
              // 사업자번호 잘못 입력된 경우
              console.log("1번에러");
              await coupangPage.evaluate(() => {
                document
                  .querySelector(
                    "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(2) > button"
                  )
                  .click();
              });
              res.send({
                message:
                  "유효하지 않은 사업자등록번호입니다. 고객센터에 문의해 주세요.",
                data: null,
                code: 503,
              });
              connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
                message:
                  "유효하지 않은 사업자등록번호입니다. 고객센터에 문의해 주세요.",
                data: null,
                code: 503,
              });
              await coupangPage.reload({
                waitUntil: ["domcontentloaded", "networkidle0"],
              });
              coupangPage.off("framenavigated");
              return;
            } else if (message === "인증해주세요.\n        ") {
              // 사업자번호 이미 사용중인 경우
              console.log("2번에러");
              await coupangPage.evaluate(() => {
                document
                  .querySelector(
                    "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(2) > button"
                  )
                  .click();
              });
              res.send({
                message:
                  "해당 사업자 번호는 이미 가입이 되어있습니다. 고객센터에 문의해 주세요.",
                data: null,
                code: 504,
              });
              connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
                message:
                  "해당 사업자 번호는 이미 가입이 되어있습니다. 고객센터에 문의해 주세요.",
                data: null,
                code: 504,
              });
              await coupangPage.reload({
                waitUntil: ["domcontentloaded", "networkidle0"],
              });
              coupangPage.off("framenavigated");
              return;
            } else {
              console.error("사업자번호 입력 에러 발생함.", error);
              res.status(500).send({
                message: "사업자번호 입력에서 에러 발생함.",
                error: error,
                code: 556,
              });
              connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
                message: "사업자번호 입력에서 에러 발생함.",
                error: error,
                code: 556,
              });
              return;
            }
          } else {
            await businessNumberCheck(coupangPage);
          }
        }
        await businessNumberCheck(coupangPage);
        if (businessNumberCheckFlag === false) {
          return;
        }
      } catch (error) {
        console.error("사업자번호 인증 에러 발생함.", error);
        res.status(500).send({
          message: "사업자번호 인증에서 에러 발생함.",
          error: error,
          code: 557,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
          message: "사업자번호 인증에서 에러 발생함.",
          error: error,
          code: 557,
        });
        return;
      }
    } else {
      let businessNumberCheckFlag = false;
      // 사업자번호가 인증이 되어 있는 경우
      if (inputBusinessNumber == BUSINESS_NUMBER) {
        // 인증된 사업자번호가 DB에 있는 사업자번호와 같은 경우
        // -> 처리가능
        businessNumberCheckFlag = true;
      } else {
        // 인증된 사업자번호와 DB에 있는 사업자 번호와 다르거나 잘못된 값이 입력된 경우
        // -> 처리불가
        res.send({
          message: "등록된 사업자정보와 일치하지 않는 사업자 입니다.",
          data: null,
          code: 505,
        });
        connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
          message: "등록된 사업자정보와 일치하지 않는 사업자 입니다.",
          data: null,
          code: 505,
        });
        await coupangPage.reload({
          waitUntil: ["domcontentloaded", "networkidle0"],
        });
        coupangPage.off("framenavigated");
        return;
      }
    }

    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(1) > dt > span"
    );
    let innerText = await coupangPage.$eval(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(1) > dt > span",
      (element) => {
        return element.innerText;
      }
    );
    let plusIdx = 0;

    if (innerText === "대표구성") {
      plusIdx = 1;
    }

    await coupangPage.waitForSelector(
      `#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(${
        1 + plusIdx
      }) > dd > span > span > span > span > span > input[type=text]`
    );
    const CEOName = await coupangPage.$(
      `#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(${
        1 + plusIdx
      }) > dd > span > span > span > span > span > input[type=text]`
    );
    await CEOName.click({ clickCount: 3 });
    await CEOName.type(NAME);
    await coupangPage.waitForSelector(
      `#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(${
        3 + plusIdx
      }) > dd > span > span > span > span > span > input[type=text]`
    );
    const businessTitle = await coupangPage.$(
      `#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(3) > div > dl:nth-child(${
        3 + plusIdx
      }) > dd > span > span > span > span > span > input[type=text]`
    );
    await businessTitle.click({ clickCount: 3 });
    await businessTitle.type(BUSINESS_TITLE);
    await coupangPage.waitForTimeout(500);
    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(4) > div > dl:nth-child(1) > dd > button"
    );
    await coupangPage.evaluate(() =>
      document
        .querySelector(
          "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(4) > div > dl:nth-child(1) > dd > button"
        )
        .click()
    );
    await coupangPage.waitForTimeout(500);

    // 쿠팡주소검색 api는 split없이 모든주소 입력가능 -> split code 주석처리
    // // 주소 입력 팝업
    // const addressParts = BUSINESS_ADDRESS.replace(/\([^)]*\)/g, "")
    //   .trim()
    //   .split(" ");
    // var addressHeader;
    // var addressBody;

    // if (addressParts.length == 4) {
    //   addressHeader = addressParts[2]; //도로명
    //   addressBody = addressParts[3]; //건물번호
    // } else if (addressParts.length == 5) {
    //   addressHeader = addressParts[3]; //도로명
    //   addressBody = addressParts[4]; //건물번호
    // }

    try {
      const elementHandle = await coupangPage.$(
        'iframe[src="https://id.coupang.com/zipcode/roadname?isMobile=true&returnUrl=https://wing.coupang.com/tenants/vendor-signup/joining/steps/basic-info/postal-code/foward"]'
      );
      const frame = await elementHandle.contentFrame();
      await frame.waitForSelector(
        "body > section > div.zipcode__wrapper > div > div > header > div > form > div.zipcode__keyword-box._zipcodeSearchKeyBox > input"
      );
      const businessAddressInput = await frame.$(
        "body > section > div.zipcode__wrapper > div > div > header > div > form > div.zipcode__keyword-box._zipcodeSearchKeyBox > input"
      );
      await businessAddressInput.type(BUSINESS_ADDRESS);
      await frame.waitForTimeout(500);
      await frame.waitForSelector(
        "body > section > div.zipcode__wrapper > div > div > header > div > form > div.zipcode__search-trigger > button"
      );
      await frame.evaluate(() =>
        document
          .querySelector(
            "body > section > div.zipcode__wrapper > div > div > header > div > form > div.zipcode__search-trigger > button"
          )
          .click()
      );
      await frame.waitForTimeout(500);
      await frame.waitForSelector(
        "body > section > div.zipcode__wrapper > div > div > div > div.zipcode__slide-view._zipcodeResultSlideRoot > div.zipcode__slide-track._zipcodeResultSlide > div.zipcode__slide-item.zipcode__slide-item--address._zipcodeResultSlideItem > div._zipcodeResultListAddress > div:nth-child(1) > span.zipcode__result__item.zipcode__result__item--road._zipcodeResultSendTrigger > span.zipcode__result__text.zipcode__result__text--address"
      );
      await frame.evaluate(() =>
        document
          .querySelector(
            "body > section > div.zipcode__wrapper > div > div > div > div.zipcode__slide-view._zipcodeResultSlideRoot > div.zipcode__slide-track._zipcodeResultSlide > div.zipcode__slide-item.zipcode__slide-item--address._zipcodeResultSlideItem > div._zipcodeResultListAddress > div:nth-child(1) > span.zipcode__result__item.zipcode__result__item--road._zipcodeResultSendTrigger > span.zipcode__result__text.zipcode__result__text--address"
          )
          .click()
      );
      await coupangPage.waitForSelector(
        "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(4) > div > dl:nth-child(3) > dd > span > span > span > span > span > input[type=text]"
      );
      const addressDetailInputDiv = await coupangPage.$(
        "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(4) > div > dl:nth-child(3) > dd > span > span > span > span > span > input[type=text]"
      );
      await addressDetailInputDiv.click({ clickCount: 3 });
      await addressDetailInputDiv.type(BUSINESS_DETAIL_ADDRESS);
    } catch (error) {
      console.error("사업자 정보 입력중 에러발생.", error);
      res.status(500).send({
        message: "사업자 정보 입력중 에러 발생함.",
        error: error,
        code: 558,
      });
      connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
        message: "사업자 정보 입력중 에러 발생함.",
        error: error,
        code: 558,
      });
      return;
    }
  } catch (error) {
    console.error("사업자 정보 입력중 에러발생.", error);
    res.status(500).send({
      message: "사업자 정보 입력중 에러 발생함.",
      error: error,
      code: 558,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "사업자 정보 입력중 에러 발생함.",
      error: error,
      code: 558,
    });
    return;
  }
  //산업은행 020
  //기업은행 030
  //국민은행 040
  //외환은행 050
  //수협은행 070
  //농협은행 110
  //농협은행(단위조합) 120
  //우리은행 200
  //SC제일은행 230
  //씨티은행 530
  //대구은행 310
  //부산은행 320
  //광주은행 340
  //제주은행 350
  //전북은행 370
  //경남은행 390
  //새마을금고 840
  //신협은행 048
  //우체국 710
  //하나은행 810
  //신한은행 260
  //케이뱅크 089
  //카카오뱅크 090
  //토스뱅크 092
  //HSBC H10
  try {
    const bankSelector =
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(1) > dd > select";
    if (params.bankType === "산업은행") {
      const optionValueToSelect = "020";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "기업은행") {
      const optionValueToSelect = "030";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "국민은행") {
      const optionValueToSelect = "040";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "외환은행") {
      const optionValueToSelect = "050";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "수협은행") {
      const optionValueToSelect = "070";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "농협은행") {
      const optionValueToSelect = "110";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "농협은행(단위조합)") {
      const optionValueToSelect = "120";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "우리은행") {
      const optionValueToSelect = "200";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "SC제일은행") {
      const optionValueToSelect = "230";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "씨티은행") {
      const optionValueToSelect = "530";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "대구은행") {
      const optionValueToSelect = "310";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "부산은행") {
      const optionValueToSelect = "320";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "광주은행") {
      const optionValueToSelect = "340";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "제주은행") {
      const optionValueToSelect = "350";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "전북은행") {
      const optionValueToSelect = "370";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "경남은행") {
      const optionValueToSelect = "390";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "새마을금고") {
      const optionValueToSelect = "840";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "신협은행") {
      const optionValueToSelect = "048";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "우체국") {
      const optionValueToSelect = "710";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "하나은행") {
      const optionValueToSelect = "810";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "신한은행") {
      const optionValueToSelect = "260";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "케이뱅크") {
      const optionValueToSelect = "089";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "카카오뱅크") {
      const optionValueToSelect = "090";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "토스뱅크") {
      const optionValueToSelect = "092";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else if (params.bankType === "HSBC") {
      const optionValueToSelect = "H10";
      await coupangPage.select(bankSelector, optionValueToSelect);
    } else {
      throw new Error("은행을 확인해 주세요.");
    }
    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(2) > dd > span:nth-child(1) > span > span > span > span > input[type=text]"
    );
    const bankUsername = await coupangPage.$(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(2) > dd > span:nth-child(1) > span > span > span > span > input[type=text]"
    );
    await bankUsername.click({ clickCount: 3 });
    await bankUsername.type(params.bankUsername);
    await coupangPage.waitForSelector(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(2) > dd > span:nth-child(2) > span > span > span > span > input[type=text]"
    );
    const bankAccountNumber = await coupangPage.$(
      "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(2) > dd > span:nth-child(2) > span > span > span > span > input[type=text]"
    );
    await bankAccountNumber.click({ clickCount: 3 });
    await bankAccountNumber.type(params.bankAccountNumber);
    await coupangPage.waitForSelector(
      ".business-section > dl:nth-child(2) > dd > button"
    );
    await coupangPage.evaluate(() =>
      document
        .querySelector(".business-section > dl:nth-child(2) > dd > button")
        .click()
    );
    await coupangPage.waitForTimeout(3000);

    //계좌인증 분기처리
    try {
      async function waitAccountCheck(coupangPage) {
        const element = await coupangPage.$(
          "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(3) > dd > span"
        );
        if (element) {
          const message = await coupangPage.evaluate(
            (el) => el.textContent,
            element
          );
          console.log(message);
          //계좌인증의 성공메세지를 받았을때만 다음 단계로 이동
          //성공메세지의 유효성 확인
          if (
            message ===
            "\n          인증이 완료되었습니다. 통장사본을 첨부해주시기 바랍니다.\n       "
          ) {
            //계좌인증 후 DB에 계좌정보 입력
            connect.insertNovaData(
              tenantId,
              "coupang_bank_type",
              params.bankType
            );
            connect.insertNovaData(
              tenantId,
              "coupang_bank_username",
              params.bankUsername
            );
            connect.insertNovaData(
              tenantId,
              "coupang_bank_account_number",
              params.bankAccountNumber
            );
            // 통신판매업 번호 입력
            await coupangPage.waitForSelector(
              "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(5) > div > dl:nth-child(1) > dd > div > span > span > span > span > span > input[type=text]"
            );
            const mailBusinessNumber = await coupangPage.$(
              "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(5) > div > dl:nth-child(1) > dd > div > span > span > span > span > span > input[type=text]"
            );
            await mailBusinessNumber.click({ clickCount: 3 });
            await mailBusinessNumber.type(MAIL_ORDER_BUSINESS_NUMBER);
            await coupangPage.waitForTimeout(500);
            // 약관 동의
            await coupangPage.waitForSelector(
              "#main > div.main-content > div:nth-child(5) > div.wuic-border > div > dl > dt > div > span.wing-web-component > input[type=checkbox]"
            );
            await coupangPage.evaluate(() => {
              document
                .querySelector(
                  "#main > div.main-content > div:nth-child(5) > div.wuic-border > div > dl > dt > div > span.wing-web-component > input[type=checkbox]"
                )
                .click();
            });
            await coupangPage.waitForTimeout(1000);

            try {
              await downloadImgFromUrl(
                "https://snapshop.kr/storage/" +
                  tenantId +
                  "/" +
                  COUPANG_BANK_PASSBOOK,
                path.join(os.tmpdir(), COUPANG_BANK_PASSBOOK)
              );
              await downloadImgFromUrl(
                "https://snapshop.kr/storage/" +
                  tenantId +
                  "/" +
                  BUSINESS_REGISTRATION,
                path.join(os.tmpdir(), BUSINESS_REGISTRATION)
              );
              await downloadImgFromUrl(
                "https://snapshop.kr/storage/" +
                  tenantId +
                  "/" +
                  MAIL_ORDER_BUSINESS_REPORT,
                path.join(os.tmpdir(), MAIL_ORDER_BUSINESS_REPORT)
              );

              // 통장사본, 사업자등록증, 통신판매신고증 등록
              // const bankPassBookFilePath =
              //   "/home/ubuntu/mail-order-business-testcode/public/images/test.jpg";
              // const businessRegistrationFilePath =
              //   "/home/ubuntu/mail-order-business-testcode/public/images/test.jpg";
              // const mailOrderBusinessReportFilePath =
              //   "/home/ubuntu/mail-order-business-testcode/public/images/test.jpg";
              const bankPassBook = await coupangPage.$(
                '.business-section > dl:last-child input[type="file"]'
              );

              await bankPassBook.uploadFile(COUPANG_BANK_PASSBOOK);
              await coupangPage.waitForTimeout(500);
              const businessRegistration = await coupangPage.$(
                ".attach-file-section > div:nth-child(3) > dl:first-child > dd input[type='file']"
              );
              await businessRegistration.uploadFile(BUSINESS_REGISTRATION);
              await coupangPage.waitForTimeout(500);
              const mailOrderBusinessReport = await coupangPage.$(
                ".attach-file-section > div:nth-child(3) > dl:last-child > dd input[type='file']"
              );
              await mailOrderBusinessReport.uploadFile(
                MAIL_ORDER_BUSINESS_REPORT
              );
            } catch (error) {
              console.error("파일 업로드 에러.", error);
              res.status(500).send({
                message: "파일 업로드 에러.",
                error: error,
                code: 562,
              });
              connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
                message: "파일 업로드 에러.",
                error: error,
                code: 562,
              });
              return;
            }

            await coupangPage.waitForTimeout(500);

            await coupangPage.waitForSelector(
              "#main > div.main-content > div.business-seller-footer > button.wing-web-component.primary-btn"
            );
            const submitCoupangSeller = await coupangPage.$(
              "#main > div.main-content > div.business-seller-footer > button.wing-web-component.primary-btn"
            );
            // 최종신고
            if (process.env.FINAL_SUMMIT === "true" ? true : false) {
              await coupangPage.evaluate(() => {
                document
                  .querySelector(
                    "#main > div.main-content > div.business-seller-footer > button.wing-web-component.primary-btn"
                  )
                  .click();
              });
            } else {
              res.send({
                message: "쿠팡윙 사업자정보를 제출 완료하였습니다.",
                data: null,
                code: 200,
              });
              connect.unuseBrowser(hashCode, tenantId, jobCodeSellerJoin, {
                message: "쿠팡윙 사업자정보를 제출 완료하였습니다.",
                data: null,
                code: 200,
              });
            }
            await coupangPage.waitForTimeout(500);

            try {
              const finalError = await coupangPage.$(
                "#main > div.main-content > div:nth-child(8) > div > div:nth-child(1) > div:nth-child(2) > span"
              );
              if (finalError) {
                const message = await coupangPage.evaluate(
                  (el) => el.textContent,
                  finalError
                );
                res.send({
                  message:
                    "입력하지 않은 값이 있습니다. 입력란을 확인해 주세요.",
                  data: null,
                  code: 506,
                });
                await coupangPage.reload({
                  waitUntil: ["domcontentloaded", "networkidle0"],
                });
                coupangPage.off("framenavigated");
                connect.unuseBrowser(hashCode, tenantId, jobCodeFinish, {
                  message:
                    "입력하지 않은 값이 있습니다. 입력란을 확인해 주세요.",
                  data: null,
                  code: 506,
                });
              } else {
                res.send({
                  message: "쿠팡윙 사업자정보를 제출 완료하였습니다.",
                  data: null,
                  code: 200,
                });
                connect.unuseBrowser(hashCode, tenantId, jobCodeFinish, {
                  message: "쿠팡윙 사업자정보를 제출 완료하였습니다.",
                  data: null,
                  code: 200,
                });
              }
            } catch (error) {
              console.error("최종 제출에서 에러.", error);
              res.status(500).send({
                message: "최종 제출에서 에러.",
                error: error,
                code: 559,
              });
              connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
                message: "최종 제출에서 에러.",
                error: error,
                code: 559,
              });
              return;
            }
          } else {
            //계좌인증 성공메세지는 받았으나 유효성 검사 실패시 에러처리 -> 페이지 새로고침
            res.send({
              message: "예금주명과 상호명(또는 대표자명)이 일치하지 않습니다.",
              data: null,
              code: 507,
            });
            await coupangPage.reload({
              waitUntil: ["domcontentloaded", "networkidle0"],
            });
            coupangPage.off("framenavigated");
            connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
              message: "예금주명과 상호명(또는 대표자명)이 일치하지 않습니다.",
              data: null,
              code: 507,
            });
          }
        } else {
          //계좌인증 실패메세지 받으면 에러처리 -> 페이지 새로고침
          const errorCheck = await coupangPage.$(
            "#main > div.main-content > div.business-seller-content > div:nth-child(2) > div:nth-child(7) > div > dl:nth-child(3) > dd > div > p"
          );
          if (errorCheck) {
            const message2 = await coupangPage.evaluate(
              (el) => el.textContent,
              errorCheck
            );
            res.send({
              message:
                "유효하지 않은 계좌(또는 이름)입니다. 확인 후 다시 입력하세요.",
              data: null,
              code: 508,
            });
            await coupangPage.reload({
              waitUntil: ["domcontentloaded", "networkidle0"],
            });
            coupangPage.off("framenavigated");
            connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
              message:
                "유효하지 않은 계좌(또는 이름)입니다. 확인 후 다시 입력하세요.",
              data: null,
              code: 508,
            });
          } else {
            //성공메세지나 실패메세지 둘 다 받지못하면 계좌인증 결과메세지 다시 확인하기
            await waitAccountCheck(coupangPage);
          }
        }
      }
      await waitAccountCheck(coupangPage);
    } catch (error) {
      console.error("계좌확인에서 에러 발생함.", error);
      res.status(500).send({
        message: "계좌확인에서 에러 발생함.",
        error: error,
        code: 560,
      });
      connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
        message: "계좌확인에서 에러 발생함.",
        error: error,
        code: 560,
      });
      return;
    }
  } catch (error) {
    console.error("은행 입력에서 에러 발생함.", error);
    res.status(500).send({
      message: "은행 입력에서 에러 발생함.",
      error: error,
      code: 561,
    });
    connect.unuseBrowser(hashCode, tenantId, jobCodeOneClickJoin, {
      message: "은행 입력에서 에러 발생함.",
      error: error,
      code: 561,
    });
    return;
  }
});

function waitFile(filePath, interval = 200, maxAttempts = 80) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function checkFile() {
      attempts++;
      fs.access(filePath, fs.constants.F_OK, (err) => {
        console.log(attempts);
        if (!err) {
          // 파일이 존재하는 경우 Promise를 성공 상태로 처리
          resolve(filePath);
        } else if (attempts < maxAttempts) {
          // 아직 파일이 생성되지 않았으며 최대 시도 횟수에 도달하지 않은 경우 재시도
          setTimeout(checkFile, interval);
        } else {
          // 최대 시도 횟수를 초과하면 Promise를 거부 상태로 처리
          reject(new Error("파일이 생성되지 않았습니다."));
        }
      });
    }

    checkFile(); // 최초 체크
  });
}

module.exports = router;
