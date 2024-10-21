import { useState } from "react";
import { MdSend, MdCancel } from "react-icons/md";
import useKeycloakAuth from "../Hooks/UseKeycloakAuth";

const Invitebyemail = () => {
  const [opendiv, setOpendiv] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");

  // Destructure the values from the useKeycloakAuth hook
  const { isAuthenticated, keycloak, handleLogin, handleLogout } = useKeycloakAuth();

  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateEmail(email)) {
      console.log(email); // Replace with actual invite logic (e.g., send an email)
      setOpendiv(false);
    } else {
      alert("Please enter a valid email address.");
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="position-relative">
      {!opendiv ? (
        <div
          className="position-absolute md:top-12 md:left-20 top-72 left-1/2 translate-middle bg-white shadow-lg rounded-circle p-4 d-flex justify-content-center align-items-center cursor-pointer"
          onClick={() => setOpendiv(true)}
          style={{ width: "80px", height: "80px", zIndex: 10 }}
        >
          <span className="fw-bold text-center">Invite</span>
        </div>
      ) : (
        <div
          className="position-absolute top-[30rem] left-1/2 translate-middle md:top-[20rem] md:translate-x-1/2 md:translate-y-32 bg-white shadow-lg rounded p-6"
          style={{ zIndex: 10 }}
        >
          <div className="flex justify-center">
            <div>
              {isAuthenticated ? (
                <div className="flex justify-center items-center gap-2 flex-col p-2 ">
                  <div className="bg rounded-full h-20 w-20 bg-black  text-white flex justify-center items-center text-5xl ">
                    {keycloak?.tokenParsed?.preferred_username[0]}
                  </div>
                  <button onClick={handleLogout} className="bg-black p-2 rounded-lg text-white">
                    Logout
                  </button>
                </div>
              ) : (
                <button onClick={handleLogin} className="bg-black text-white p-2 rounded-lg">
                  Login
                </button>
              )}
              <h2 className="text-center mb-3">Invite by Email</h2>
              <form onSubmit={handleInvite} className="d-flex flex-column gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control"
                  placeholder="Enter email"
                  required
                />
                <div className="d-flex justify-content-between gap-2">
                  <button type="submit" className="btn bg-black text-white d-flex align-items-center">
                    <MdSend className="me-2" /> Invite
                  </button>
                  <button
                    type="button"
                    className="btn bg-black text-white d-flex align-items-center"
                    onClick={() => setOpendiv(false)}
                  >
                    <MdCancel className="me-2" /> Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invitebyemail;
