import { Navigate } from "react-router-dom";

const RequireAdmin = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.isAdmin;

  if (!role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireAdmin;
