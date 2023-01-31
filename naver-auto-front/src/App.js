import "./App.css";
import { useEffect, useState } from "react";
import SignIn from "./SignIn";

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  const getAuth = async () => {
    const res = await fetch("http://localhost/api/users/auth").then((res) =>
      res.json()
    );
    console.log(res);
    setAuthenticated(res.isAuth);
  };

  useEffect(() => {
    getAuth();
  }, []);

  return <>{authenticated ? <>로그인 성공</> : <SignIn></SignIn>}</>;
}

export default App;
