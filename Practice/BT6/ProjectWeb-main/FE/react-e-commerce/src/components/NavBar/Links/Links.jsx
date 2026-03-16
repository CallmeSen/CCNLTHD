import { Link, useLocation } from "react-router-dom";

const Links = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  // Lấy user từ localStorage (hoặc từ Redux/context tuỳ bạn)
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.isAdmin === true;

  const scrollToProducts = () => {
    if (!isHomePage) return;
    const products = document.getElementById("products");
    if (products) {
      products.scrollIntoView({ behavior: "smooth" });
      removeExpandedClass();
    }
  };

  const removeExpandedClass = () => {
    let mobileExpandedMenu = document.querySelector(".mobile-expanded-menu");
    if (mobileExpandedMenu) {
      mobileExpandedMenu.classList.remove("mobile-expanded");
    }
  };

  return (
    <div className="links">
      <Link to="/" onClick={removeExpandedClass}>
        Deals
      </Link>
      <Link to="/#products" onClick={scrollToProducts}>
        What's New
      </Link>
      <Link to="/delivery" onClick={removeExpandedClass}>
        Delivery
      </Link>
      {role && (
        <Link to="/dashboard" onClick={removeExpandedClass}>
          Admin
        </Link>
      )}
    </div>
  );
};

export default Links;
