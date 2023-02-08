import "./App.css";
import { useEffect, useState } from "react";
import SignIn from "./SignIn";
import Dashboard from "./dashboard/Dashboard";
export const API_BASE_URL = process.env.REACT_APP_API_HOST;

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  const getAuth = async () => {
    const requestOptions = {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    };

    const res = await fetch(
      `${API_BASE_URL}/api/users/auth`,
      requestOptions
    ).then((res) => res.json());
    console.log(res);
    setAuthenticated(res.isAuth);
    return res;
  };

  useEffect(() => {
    getAuth();
  }, []);

  return (
    <>
      {authenticated ? (
        <Dashboard getAuth={getAuth} />
      ) : (
        <SignIn getAuth={getAuth}></SignIn>
      )}
    </>
  );
}

export default App;
