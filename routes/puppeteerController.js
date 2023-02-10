const express = require("express");
const { auth } = require("../middleware/auth");
const { executablePath } = require("puppeteer");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

const router = express.Router();

puppeteer.use(StealthPlugin());
(async () => {
  global.browser = await puppeteer
    .launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      // headless: false, //headless는 test할때만 true로 두고, 배포 시엔 반드시 false
      executablePath: executablePath(),
    })
    .then(console.log("pupp open"));
  await browser.userAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36"
  );
})();

//test
router.get("/", auth, async (req, res) => {
  global.page = await browser.newPage().then(res.send("open"));
});

router.post("/logintest", auth, async (req, res) => {
  try {
    global.loginPage = await browser.newPage();

    // [SET ID & PW]
    // const naver_id = "ghwls4498";
    // const naver_pw = "dbal2413";
    const naver_id = req.body.id;
    const naver_pw = req.body.password;
    await loginPage.goto(
      "https://accounts.commerce.naver.com/login?url=https%3A%2F%2Fsell.smartstore.naver.com%2F%23%2Flogin-callback",
      {
        waitUntil: "networkidle2",
      }
    );

    await loginPage.click(
      "#root > div > div.Layout_wrap__3uDBh > div > div > div.Login_login_area__cMnCU.Login_type__nM7Ia > div.Login_login_content__Ia6Rm > ul > li:nth-child(2) > button"
    );
    //[login modal]
    await browser.pages().then(async (data) => {
      await data[2].waitForNavigation();
      await data[2].evaluate(
        (id, pw) => {
          document.querySelector("#id").value = id;
          document.querySelector("#pw").value = pw;
        },
        naver_id,
        naver_pw
      );
      await data[2].click("#log\\.login");
    });

    //2단계인증 if
    await loginPage.waitForTimeout(3000);
    console.log(loginPage.url().replace(/.+\/\/|www.|\..+/g, ""));
    if (loginPage.url().replace(/.+\/\/|www.|\..+/g, "") == "accounts") {
      //2단계 인증
      console.log("Two-factor authentication");
      await loginPage.click(
        "#root > div > div.Layout_wrap__3uDBh > div > div > div > ul > li.TwoStepCertify_choice_item__2qian.TwoStepCertify_on__2Y_8N > div > div.TextField_text_field__x1Wtz.TextField_field_email__2BzY5.TextField_disabled__2mxn3 > div > div > div.TextField_btn_box__2TdIe > button"
      );
      await loginPage.waitForTimeout(500);
      await loginPage.click(
        "#root > div.PopupDimmed_dimmed__25S58 > div > div > div > button.PopupCommon_btn_confirm__2d0k8"
      );
      res.json({ success: true, message: "2단계 인증" });
    } else {
      await loginPage.waitForSelector("#seller-content > ui-view ");
      loginPage.close();

      console.log("loginOK");
      res.json({ success: true, message: "접속 테스트 성공" });
    }
  } catch (err) {
    // 에러 핸들링
    browser.close();
    (async () => {
      global.browser = await puppeteer
        .launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          // headless: false, //headless는 test할때만 true로 두고, 배포 시엔 반드시 false
          executablePath: executablePath(),
        })
        .then(console.log("pupp open"));
      await browser.userAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36"
      );
    })();
    console.log(err);
    res.json({ success: false, err });
  }
});

router.post("/naverauth", auth, async (req, res) => {
  try {
    //loginPage 인증번호 입력 후, 확인.
    // await loginPage.hover(
    //   "#root > div > div.Layout_wrap__3uDBh > div > div > div > ul > li.TwoStepCertify_choice_item__2qian.TwoStepCertify_on__2Y_8N > div > div.TwoStepCertify_certify_num__1m4OX > div > div.TextField_ipt_item__1AOpe.TextField_on__39QRo > div > div.TextField_ipt_box__3aPWa > div > input"
    // );document.querySelector("#root > div > div.Layout_wrap__3uDBh > div > div > div > ul > li.TwoStepCertify_choice_item__2qian.TwoStepCertify_on__2Y_8N > div > div.TwoStepCertify_certify_num__1m4OX > div > div.TextField_ipt_item__1AOpe > div > div.TextField_ipt_box__3aPWa > div > input")
    await loginPage.type(
      "#root > div > div.Layout_wrap__3uDBh > div > div > div > ul > li.TwoStepCertify_choice_item__2qian.TwoStepCertify_on__2Y_8N > div > div.TwoStepCertify_certify_num__1m4OX > div > div.TextField_ipt_item__1AOpe > div > div.TextField_ipt_box__3aPWa > div > input",
      req.body.code
    );
    await loginPage.waitForTimeout(1000);
    await loginPage.click(
      "#root > div > div.Layout_wrap__3uDBh > div > div > div > div.TwoStepCertify_btn_box__3TSSP > button"
    );
    await loginPage.waitForTimeout(1000);
    await loginPage.click(
      "#root > div.PopupDimmed_dimmed__25S58 > div > div > div > button.PopupCommon_btn_confirm__2d0k8"
    );
    //#root > div > div.Layout_wrap__3uDBh > div > div > div > div.TwoStepCertify_btn_box__3TSSP > button
    await loginPage.waitForSelector("#seller-content > ui-view ");
    loginPage.close();

    console.log("loginOK");
    res.json({ success: true, message: "접속 테스트 성공" });
  } catch (err) {
    // 에러 핸들링
    browser.close();
    (async () => {
      global.browser = await puppeteer
        .launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          // headless: false, //headless는 test할때만 true로 두고, 배포 시엔 반드시 false
          executablePath: executablePath(),
        })
        .then(console.log("pupp open"));
      await browser.userAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36"
      );
    })();
    console.log(err);
    res.json({ success: false, err });
  }
});

router.post("/priceset", auth, async (req, res) => {
  const page = await browser.newPage();
  console.log("페이지1 오픈");

  const page2 = await browser.newPage();
  console.log("페이지2 오픈");
  try {
    //[SET ID & PW]
    const naver_id = req.body.id;
    const naver_pw = req.body.password;
    //[SET price code & price & URL]
    const price_code = req.body.code;
    const URL = req.body.url;

    //[get lowest price]
    await page2.goto(URL, {
      waitUntil: "networkidle2",
    });
    console.log("비교 url 이동");
    console.log(URL);
    console.log(page2.url());

    // var lowestPrice = await page2.$eval(
    //   "#__next > div > div.style_container__D_mqP > div.style_inner__ZMO5R > div.style_content_wrap__78pql > div.style_content__v25xx > div > div.summary_info_area__NP6l5 > div.lowestPrice_price_area__VDBfj > div.lowestPrice_low_price__Ypmmk > em",
    //   (el) => {
    //     return el.innerText.replace(",", "");
    //   }
    // );

    // const getPrice = async () => {
    //   return await page2.evaluate(async () => {
    //     return await new Promise((resolve) => {
    //       var price = document
    //         .querySelector(
    //           "#__next > div > div.style_container__D_mqP > div.style_inner__ZMO5R > div.style_content_wrap__78pql > div.style_content__v25xx > div > div.summary_info_area__NP6l5 > div.lowestPrice_price_area__VDBfj > div.lowestPrice_low_price__Ypmmk > em"
    //         )
    //         .innerText.replace(",", "");
    //       resolve(price);
    //     });
    //   });
    // };
    // const lowestPrice = await getPrice();
    const lowestPrice = await page2.evaluate(() => {
      const el = document.querySelector(
        "#__next > div > div.style_container__D_mqP > div.style_inner__ZMO5R > div.style_content_wrap__78pql > div.style_content__v25xx > div > div.summary_info_area__NP6l5 > div.lowestPrice_price_area__VDBfj > div.lowestPrice_low_price__Ypmmk > em"
      );
      if (!el) {
        return 15000;
      }

      // .replace(",", "");
      // var price = el.innerText.replace(",", "");
      return 10000;
    });
    // let lowestPrice = "15000";
    console.log("값 가져오기");

    await page2.close();
    console.log(lowestPrice);

    await page.goto(
      "https://sell.smartstore.naver.com/#/products/origin-list",
      {
        waitUntil: "networkidle2",
      }
    );
    //if url 도메인이 accounts.commerce.naver.com 로그인
    //else 가격 설정
    console.log(page.url().replace(/.+\/\/|www.|\..+/g, ""));
    if (page.url().replace(/.+\/\/|www.|\..+/g, "") == "accounts") {
      await page.click(
        "#root > div > div.Layout_wrap__3uDBh > div > div > div.Login_login_area__cMnCU.Login_type__nM7Ia > div.Login_login_content__Ia6Rm > ul > li:nth-child(2) > button"
      );

      //[login modal]
      await browser.pages().then(async (data) => {
        //console.log(data);
        await data[2].waitForNavigation();
        await data[2].evaluate(
          (id, pw) => {
            document.querySelector("#id").value = id;
            document.querySelector("#pw").value = pw;
          },
          naver_id,
          naver_pw
        );
        await data[2].click("#log\\.login");
      });

      //[product search]
      await page.waitForSelector(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-body > div > ul > li:nth-child(1) > div > div > div:nth-child(2) > textarea"
      );
      await page.type(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-body > div > ul > li:nth-child(1) > div > div > div:nth-child(2) > textarea",
        price_code
      );
      await page.waitForSelector(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-body > div > ul > li:nth-child(6) > div > div > ncp-datetime-range-picker2 > div:nth-child(1) > div > div > button:nth-child(7)"
      );
      await page.click(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-body > div > ul > li:nth-child(6) > div > div > ncp-datetime-range-picker2 > div:nth-child(1) > div > div > button:nth-child(7)"
      );
      await page.waitForSelector(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-footer > div > button.btn.btn-primary"
      );
      await page.click(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-footer > div > button.btn.btn-primary"
      );

      //[edit price]
      await page.waitForSelector(
        "#seller-content > ui-view > div > ui-view:nth-child(2) > div.panel.panel-seller > div.panel-body > div.seller-grid-area > div > div > div > div > div.ag-body-viewport.ag-layout-normal.ag-row-no-animation > div.ag-pinned-left-cols-container > div.ag-row.ag-row-no-focus.ag-row-even.ag-row-level-0.ag-row-position-absolute.ag-row-first > div:nth-child(2) > span > button"
      );
      await page.click(
        "#seller-content > ui-view > div > ui-view:nth-child(2) > div.panel.panel-seller > div.panel-body > div.seller-grid-area > div > div > div > div > div.ag-body-viewport.ag-layout-normal.ag-row-no-animation > div.ag-pinned-left-cols-container > div.ag-row.ag-row-no-focus.ag-row-even.ag-row-level-0.ag-row-position-absolute.ag-row-first > div:nth-child(2) > span > button"
      );
      await page.waitForSelector("#prd_price2");
      await page.click("#prd_price2");
      await page.$eval(
        "#prd_price2",
        (el, price) => {
          el.value = price;
        },
        lowestPrice
      );
      await page.click("#error_salePrice > div:nth-child(1) > div > span");
      await page.waitForSelector(
        "#productFormMobileFloatingBar > div:nth-child(2) > button"
      );
      await page.$eval(
        "#productFormMobileFloatingBar > div:nth-child(2) > button",
        (el) => el.click()
      );
      page.close();
      console.log("price Setting OK");
      res.json({ success: true, message: "가격 설정 완료" });
    } else {
      //[product search]
      await page.waitForSelector(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-body > div > ul > li:nth-child(1) > div > div > div:nth-child(2) > textarea"
      );
      await page.type(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-body > div > ul > li:nth-child(1) > div > div > div:nth-child(2) > textarea",
        price_code
      );
      await page.waitForSelector(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-body > div > ul > li:nth-child(6) > div > div > ncp-datetime-range-picker2 > div:nth-child(1) > div > div > button:nth-child(7)"
      );
      await page.click(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-body > div > ul > li:nth-child(6) > div > div > ncp-datetime-range-picker2 > div:nth-child(1) > div > div > button:nth-child(7)"
      );
      await page.waitForSelector(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-footer > div > button.btn.btn-primary"
      );
      await page.click(
        "#seller-content > ui-view > div > ui-view:nth-child(1) > div.panel.panel-seller > form > div.panel-footer > div > button.btn.btn-primary"
      );

      //[edit price]
      await page.waitForSelector(
        "#seller-content > ui-view > div > ui-view:nth-child(2) > div.panel.panel-seller > div.panel-body > div.seller-grid-area > div > div > div > div > div.ag-body-viewport.ag-layout-normal.ag-row-no-animation > div.ag-pinned-left-cols-container > div.ag-row.ag-row-no-focus.ag-row-even.ag-row-level-0.ag-row-position-absolute.ag-row-first > div:nth-child(2) > span > button"
      );
      await page.click(
        "#seller-content > ui-view > div > ui-view:nth-child(2) > div.panel.panel-seller > div.panel-body > div.seller-grid-area > div > div > div > div > div.ag-body-viewport.ag-layout-normal.ag-row-no-animation > div.ag-pinned-left-cols-container > div.ag-row.ag-row-no-focus.ag-row-even.ag-row-level-0.ag-row-position-absolute.ag-row-first > div:nth-child(2) > span > button"
      );
      await page.waitForSelector("#prd_price2");
      await page.click("#prd_price2");
      await page.$eval(
        "#prd_price2",
        (el, price) => {
          el.value = price;
        },
        lowestPrice
      );
      await page.click("#error_salePrice > div:nth-child(1) > div > span");
      await page.waitForSelector(
        "#productFormMobileFloatingBar > div:nth-child(2) > button"
      );
      await page.$eval(
        "#productFormMobileFloatingBar > div:nth-child(2) > button",
        (el) => el.click()
      );
      page.close();
      console.log("price Setting OK");
      res.json({ success: true, message: "가격 설정 완료" });
    }
  } catch (err) {
    // 에러 핸들링
    browser.close();
    (async () => {
      global.browser = await puppeteer
        .launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          // headless: false, //headless는 test할때만 true로 두고, 배포 시엔 반드시 false
          executablePath: executablePath(),
        })
        .then(console.log("pupp open"));
      await browser.userAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36"
      );
    })();
    res.json({ success: false, err });
  }
});

module.exports = router;
