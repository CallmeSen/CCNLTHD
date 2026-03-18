import HomeView from "./views/HomeView";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "@/components/NavBar/NavBar";
import ShopFooter from "@/components/Footer/ShopFooter";
import ErrorView from "./views/ErrorView";
import CartView from "./views/CartView";
import AdminView from "./views/AdminView";
import ProtectRoute from "@/components/NavBar/Links/ProtectRoute";
import DeliveryView from "./views/DeliveryView";
import "react-loading-skeleton/dist/skeleton.css";
import { useEffect } from "react";
import { useGlobalContext } from "@/components/GlobalContext/GlobalContext";
import { ToastContainer, toast } from "react-toastify";
import Modal from "./components/Modals/Modal";
import CancelOrder from "./components/Modals/CancelOrder";
import "react-toastify/dist/ReactToastify.css";
import RequestCookie from "./components/CookieBanner/CookieBanner";
import ProductTable from "./components/Admin/ProductTable";
import OrdersTable from "./components/Admin/OrdersTable";
import UsersTable from "./components/Admin/UsersTable";
import PaymentResult from "@/components/Payment/PaymentResult.jsx";


function App() {
  let { store } = useGlobalContext();
  let { modal } = useGlobalContext();
  useEffect(() => {
    if (store.state.products.length > 0) return;
    store.getProductsByPage();
  }, []);
  return (
    <div>
      <BrowserRouter>
        <header>
          <NavBar></NavBar>
        </header>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/cart" element={<CartView />} />
          <Route path="/delivery" element={<DeliveryView />} />
          <Route path="/dashboard" element={<ProtectRoute><AdminView /></ProtectRoute>}>
            <Route path="product" element={<ProtectRoute><ProductTable /></ProtectRoute>} />
            <Route path="orders" element={<ProtectRoute><OrdersTable /></ProtectRoute>} />
            <Route path="users" element={<UsersTable />} />
          </Route>
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="*" element={<ErrorView />} />
        </Routes>
        <footer>
          <ShopFooter></ShopFooter>
        </footer>
      </BrowserRouter>
      {modal.opened && (
        <Modal
          header={modal.isRegister ? "Create Account" : "Login"}
          submitAction="/"
          buttonText={modal.isRegister ? "Create Account" : "Login"}
          isRegister={modal.isRegister}
        />
      )}
      {modal.isCancelModal && <CancelOrder></CancelOrder>}
      <ToastContainer />
      {/* <RequestCookie /> */}
    </div>
  );
}

export default App;
