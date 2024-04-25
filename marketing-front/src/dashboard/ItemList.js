import * as React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Title from "./Title";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useSelector } from "react-redux";
import { useEffect } from "react";
export const API_BASE_URL = process.env.REACT_APP_API_HOST;

export default function ItemList() {
  const userData = useSelector((store) => store.userData);
  const [items, setItems] = React.useState([]);
  const [item, setItem] = React.useState({
    product_name: "",
    code: "",
    url: "",
  });

  const [account, setAccount] = React.useState({
    id: "",
    password: "",
  });

  const [inProgress, setInProgress] = React.useState(false);

  const handleChange = (e) => {
    setItem({
      ...item,
      [e.target.id]: e.target.value,
    });
  };

  const getData = async () => {
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    };

    const res = await fetch(
      `${API_BASE_URL}/mongo/items/` + userData._id,
      requestOptions
    )
      .then((res) => res.json())
      .catch((err) => console.error("error:" + err));

    setItems(res.items);
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
    getData();
    getAccount();
  }, []);

  const insertItem = async (event) => {
    event.preventDefault();

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        user: userData._id,
        itemName: item.product_name,
        code: item.code,
        url: item.url,
      }),
    };
    const res = await fetch(`${API_BASE_URL}/mongo/item`, requestOptions).then(
      (res) => res.json()
    );
  };

  const setPrice = async (code, url, event) => {
    event.preventDefault();
    if (account.id == "" || account.password == "")
      return alert("스마트 스토어 계정을 저장해주세요");
    setInProgress(true);

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: account.id,
        password: account.password,
        code: code,
        url: url,
      }),
    };
    await fetch(`${API_BASE_URL}/controller/priceset`, requestOptions)
      .then((res) => res.json())
      .then((res) => {
        alert(res.message);
        setInProgress(false);
      });
  };

  return (
    <React.Fragment>
      <Title>List</Title>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>상품명</TableCell>
            <TableCell>price_code</TableCell>
            <TableCell>URL</TableCell>
            {/* <TableCell>-</TableCell>
            <TableCell>-</TableCell> */}
            <TableCell align="right"></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              <TextField
                id="product_name"
                label="상품명"
                variant="outlined"
                margin="dense"
                onChange={handleChange}
              />
            </TableCell>
            <TableCell>
              <TextField
                id="code"
                label="code"
                variant="outlined"
                margin="dense"
                onChange={handleChange}
              />
            </TableCell>
            <TableCell>
              <TextField
                id="url"
                label="url"
                variant="outlined"
                margin="dense"
                onChange={handleChange}
              />
            </TableCell>
            <TableCell>
              <Button
                onClick={(e) => {
                  insertItem(e);
                }}
                variant="outlined"
              >
                추가
              </Button>
            </TableCell>
          </TableRow>
          {items.map((row) => (
            <TableRow key={row._id}>
              <TableCell>{row.itemName}</TableCell>
              <TableCell>{row.code}</TableCell>
              <TableCell style={{ wordBreak: "break-all" }}>
                {row.url}
              </TableCell>
              {/* <TableCell>{row.shipTo}</TableCell>
              <TableCell>{row.paymentMethod}</TableCell> */}
              <TableCell align="right">
                <Button
                  onClick={(e) => {
                    setPrice(row.code, row.url, e);
                  }}
                  variant="outlined"
                  disabled={inProgress}
                >
                  적용
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* <Link color="primary" href="#" onClick={preventDefault} sx={{ mt: 3 }}>
        See more orders
      </Link> */}
    </React.Fragment>
  );
}
