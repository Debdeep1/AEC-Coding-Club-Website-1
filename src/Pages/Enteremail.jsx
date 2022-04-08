import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BiArrowBack } from "react-icons/bi";
import EmailForme from "./Components/EmailForme";
import forgotpassword from "../Assets/forgotpassword.svg";

const Enteremail = () => {
  let navigate = useNavigate();
  async function tokenCheker() {
    const authToken = localStorage.getItem("token");
    if (authToken) {
      navigate("/");
    }
  }

  useEffect(() => {
    tokenCheker();
  }, []);

  return (
    <>
      <div className="user-login ">
        <div className="user-img">
          <img alt="" src={forgotpassword}></img>
        </div>
        <EmailForme />
      </div>
    </>
  );
};

export default Enteremail;
