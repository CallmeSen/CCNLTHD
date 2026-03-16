import "./OrderSummary.css";
import { useGlobalContext } from "@/components/GlobalContext/GlobalContext";
import { useState } from "react";
import { toast } from "react-toastify";

const OrderSummary = () => {
  const { store, modal, auth } = useGlobalContext();
  const [deliveryType, setDeliveryType] = useState("Standard");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD"); // COD = Cash on Delivery

  const setDelivery = (type) => {
    setDeliveryType(type);
  };


  const checkOut = async () => {
    let payload = {
      DeliveryType: deliveryType,
      DeliveryTypeCost: deliveryType === "Standard" ? 5 : 10,
      costAfterDelieveryRate:
          store.state.cartTotal + (deliveryType === "Standard" ? 5 : 10),
      promoCode: "",
      phoneNumber: phone,
      paymentMethod: paymentMethod,
      user_id: auth.state.user?.id,
    };
    console.log(payload)

    const response = await store.confirmOrder(payload);
    if (response.showRegisterLogin) {
      modal.openModal();
    }
  };
  return (
    <div className="is-order-summary">
      <div className="sub-container">
        <div className="contains-order">
          <div className="total-cost">
            <h4>Total Items ({store.state.cartQuantity})</h4>
            <h4>${store.state.cartTotal}</h4>
          </div>
          <div className="shipping">
            <h4>Shipping</h4>
            <select
                className="select-dropdown"
                onChange={(item) => {
                  setDelivery(item.target.value);
                }}
            >
              <option value="Standard" className="select">
                Standard
              </option>
              <option value="Express" className="select">
                Express
              </option>
            </select>
          </div>
          <div className="promo-code">
            <h4>Promo Code</h4>
            <div className="enter-promo">
              <input className="select-dropdown" type="text"/>
              <button
                  className="flat-button apply-promo"
                  disabled={store.state.cartQuantity > 0 ? false : true}
              >
                Apply
              </button>
            </div>
          </div>
          <div className="promo-code">
            <h4>Phone Number</h4>
            <input
                className="select-dropdown"
                type="text"
                onChange={(item) => {
                  setPhone(item.target.value);
                }}
            />
            <small>
              <em style={{color: "#ff2100"}}>
                Your number would be called to verify the order placement
              </em>
            </small>
          </div>
          <div className="payment-method">
            <h4>Payment Method</h4>
            <select
                className="select-dropdown"
                onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="CASH_ON_DELIVERY" className="select">
                Cash on Delivery
              </option>
              <option value="VNPAY" className="select">
                VNPay
              </option>
            </select>
          </div>
          <div className="final-cost">
            <h4>Total Cost</h4>
            <h4>
              $
              {store.state.cart.length > 0
                  ? store.state.cartTotal + (deliveryType === "Standard" ? 5 : 10)
                  : 0}
            </h4>
          </div>
          <div className="final-checkout">
            <button
                className="flat-button checkout"
                onClick={() => {
                  if (phone.length > 0) {
                    checkOut();
                    if (paymentMethod !== "VNPay") {
                      toast.info("Your order is being processed");
                    }
                    return;
                  }
                  toast.error("Please enter your phone number");
                }}
                disabled={store.state.cartQuantity <= 0}
            >
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OrderSummary;
