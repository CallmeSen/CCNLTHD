import { useReducer } from "react";
import { toast } from "react-toastify";
import useAuth from "@/store/auth.js";
const initialState = {
  orders: [],
  order_to_be_canceled: null,
};


const actions = Object.freeze({
  GET_ORDERS: "GET_ORDERS",
  GET_ORDER_TO_BE_CANCELED: "GET_ORDER_TO_BE_CANCELED",
});

const reducer = (state, action) => {
  if (action.type == actions.GET_ORDERS) {
    return { ...state, orders: action.orders };
  }

  if (action.type == actions.GET_ORDER_TO_BE_CANCELED) {
    return { ...state, order_to_be_canceled: action.order_id };
  }
  return state;
};

const useOrders = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const auth = useAuth()
  const getOrders = async (user_id) => {
    try {
      const userId  = auth.state.user.id;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/order/${userId}/get-orders`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        credentials: "include",
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
  
      const data = await response.json();
      dispatch({ type: actions.GET_ORDERS, orders: data });
      return data;
    } catch (err) {
      console.error("Fetch order error:", err.message);
      return [];
    }
  };
  

  const setOrderToBeCanceled = (order_id) => {
    dispatch({ type: actions.GET_ORDER_TO_BE_CANCELED, order_id:order_id });
  };

  const cancelOrder = async (order_id) => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/order/cancel-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        credentials: "include",
        body: JSON.stringify({ id: order_id }),
      }
    );

    const data = await response.json();

    if (data.error) {
      return data.error;
    }

    // dispatch({ type: actions.GET_ORDER_TO_BE_CANCELED, order_id: null });
    // getOrders(data.user_id);
      dispatch({
          type: actions.UPDATE_ORDER_STATUS,
          payload: {
              order_id: data.order_id,
              status: data.status,
          },
      });
    return data;
  };

  return { state, getOrders, setOrderToBeCanceled, cancelOrder };
};

export default useOrders;
