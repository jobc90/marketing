import * as React from "react";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Title from "./Title";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import { useSelector } from "react-redux";
import { useEffect } from "react";
export const API_BASE_URL = process.env.REACT_APP_API_HOST;

export default function Account() {
  const userData = useSelector((store) => store.userData);

  const [showPassword, setShowPassword] = React.useState(false);
  const [data, setData] = React.useState({
    id: "",
    password: "",
  });
  const [testing, setTesting] = React.useState(false);
  const [account, setAccount] = React.useState({
    id: "",
    password: "",
  });
  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleChange = (e) => {
    setData({
      ...data,
      [e.target.id]: e.target.value,
    });
  };

  const getAccount = async () => {
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    };

    const res = await fetch(
      `${API_BASE_URL}/mongo/account/` + userData._id,
      requestOptions
    )
      .then((res) => res.json())
      .catch((err) => console.error("error:" + err));

    if (res.account[0]) {
      setAccount({
        id: res.account[0].id,
        password: res.account[0].password,
      });
    }
  };

  useEffect(() => {
    getAccount();
  }, []);

  const linkTest = async (event) => {
    event.preventDefault();
    // console.log(data);
    setTesting(true);

    if (data.id == "" || data.password == "") {
      if (account.id == "" || account.password == "") {
        setTesting(false);
        return alert("정보를 입력해주세요");
      }
    }
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: data.id == "" ? account.id : data.id,
        password: data.password == "" ? account.password : data.password,
      }),
    };
    const res = await fetch(
      `${API_BASE_URL}/controller/logintest`,
      requestOptions
    ).then((res) => res.json());

    alert(res.message);
    setTesting(false);
    if (res.message == "2단계 인증") {
      setTesting(true);

      var inputString = prompt("2단계 인증 번호를 입력해주세요 [이메일 인증]"); //나중에 이메일도 가져오기(api)
      const requestOptions2 = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: inputString,
        }),
      };

      const res2 = await fetch(
        `${API_BASE_URL}/controller/naverauth`,
        requestOptions2
      ).then((res) => res.json());
      alert(res2.message);
      setTesting(false);
    }
  };

  const saveAccount = async (event) => {
    event.preventDefault();

    if (data.id == "" || data.password == "") {
      return alert("정보를 모두 입력해주세요");
    }

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        user: userData._id,
        id: data.id,
        password: data.password,
        commerce: "naver",
      }),
    };
    const res = await fetch(
      `${API_BASE_URL}/mongo/account`,
      requestOptions
    ).then((res) => res.json());
    if (!res.success) return alert("저장 실패");
    console.log(res);
    alert("저장되었습니다. \n");
  };
  // 문자열 검색해서 중간 글자 *로 만들기
  // 2글자면 마지막 글자만
  const maskingName = function (strName) {
    if (strName.length > 2) {
      var originName = strName.split("");
      originName.forEach(function (name, i) {
        if (i === 0 || i === originName.length - 1) return;
        originName[i] = "*";
      });
      var joinName = originName.join();
      return joinName.replace(/,/g, "");
    } else {
      var pattern = /.$/; // 정규식
      return strName.replace(pattern, "*");
    }
  };
  return (
    <React.Fragment>
      {testing ? (
        <Box sx={{ width: "100%" }}>
          <LinearProgress />
        </Box>
      ) : (
        <></>
      )}

      <Title>스마트 스토어 계정</Title>
      <TextField
        id="id"
        label={account.id == "" ? "ID" : account.id}
        variant="outlined"
        margin="dense"
        onChange={handleChange}
      />
      <FormControl variant="outlined" margin="dense">
        <InputLabel htmlFor="outlined-adornment-password">
          {account.password == "" ? "Password" : maskingName(account.password)}
        </InputLabel>
        <OutlinedInput
          id="password"
          type={showPassword ? "text" : "password"}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          }
          label="Password"
          onChange={handleChange}
        />
      </FormControl>

      <Stack direction="row" justifyContent="space-between">
        <Button variant="contained" onClick={linkTest} disabled={testing}>
          접속 TEST
        </Button>
        <Button variant="outlined" onClick={saveAccount}>
          계정 저장
        </Button>
      </Stack>
    </React.Fragment>
  );
}
