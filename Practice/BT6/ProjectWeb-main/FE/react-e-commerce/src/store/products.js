import { useReducer } from "react";
import localforage from "localforage";
import { toast } from "react-toastify";

const initialState = {
  products: [],
  cart: [],
  cartTotal: 0,
  cartQuantity: 0,
  order: [],
};

const actions = Object.freeze({
  ADD_TO_CART: "ADD_TO_CART",
  GET_PRODUCTS: "GET_PRODUCTS",
  REMOVE_FROM_CART: "REMOVE_FROM_CART",
  CLEAR_CART: "CLEAR_CART",
  ADD_QUANTITY: "ADD_QUANTITY",
  REDUCE_QUANTITY: "REDUCE_QUANTITY",
  PREFILL_CART: "PREFILL_CART",
  ADD_PRODUCT: "ADD_PRODUCT",

});

const reducer = (state, action) => {
  // ADD PRODUCT
  if (action.type === actions.ADD_PRODUCT) {
  const updatedProduct = {
    ...action.product,
    addedToCart: false, // ensure default flag
  };
  return {
    ...state,
    products: [...state.products, updatedProduct],
  };
}

  // GET PRODUCTS
  if (action.type == actions.GET_PRODUCTS) {
    if (action.backed_up_cart == []) {
      return { ...state, products: action.products };
    }
    // prefil cart
    const cartTotal = action.backed_up_cart.reduce(
      (acc, item) => acc + item.price,
      0
    );
    const cartQuantity = action.backed_up_cart.reduce(
      (acc, item) => acc + item.quantity,
      0
    );

    const updatedProducts = action.products.map((product) => {
      const cartItem = action.backed_up_cart.find(
        (item) => item.id === product.id
      );
      if (cartItem) {
        return { ...cartItem, addedToCart: true };
      } else {
        return product;
      }
    });
    return {
      ...state,
      products: updatedProducts,
      cart: action.backed_up_cart,
      cartQuantity,
      cartTotal,
    };
  }
  // ADD TO CART
  if (action.type == actions.ADD_TO_CART) {
    const product = state.products.find(
      (product) => product.id == action.product
    );
    product.addedToCart = true;
    product.quantity = 1;

    // backup with local Forage here
    localforage.setItem("cartItems", [...state.cart, product]);

    return {
      ...state,
      cart: [...state.cart, product],
      cartQuantity: state.cartQuantity + 1,
      cartTotal: state.cartTotal + product.price,
    };
  }
  // Remove from cart
  if (action.type == actions.REMOVE_FROM_CART) {
    const product = state.products.find(
      (product) => product.id == action.product
    );
    const newCart = state.cart.filter(
      (product) => product.id != action.product
    );
    const updatedProduct = { ...product, addedToCart: false };
    localforage.setItem("cartItems", newCart);

    // recalculate cart total
    let newCartTotal = 0;
    newCart.forEach((item) => {
      newCartTotal += item.price * item.quantity;
    });
    return {
      ...state,
      products: state.products.map((p) =>
        p.id === product.id ? updatedProduct : p
      ),
      cart: newCart,
      cartQuantity: state.cartQuantity - 1,
      cartTotal: newCartTotal,
    };
  }

  // add quantity
  if (action.type == actions.ADD_QUANTITY) {
    const product = state.cart.find((product) => product.id == action.product);
    product.quantity = product.quantity + 1;

    return {
      ...state,
      cartTotal: state.cartTotal + product.price,
    };
  }

  // reduce quantity
  if (action.type == actions.REDUCE_QUANTITY) {
    const product = state.cart.find((product) => product.id == action.product);
    if (product.quantity == 1) {
      return state;
    }
    product.quantity = product.quantity - 1;
    return {
      ...state,
      cartTotal: state.cartTotal - product.price,
    };
  }

  // clear cart
  if (action.type == actions.CLEAR_CART) {
    localforage.setItem("cartItems", []);
    
    return {
      ...state,
      cart: [],
      order: [],
      cartTotal: 0,
      cartQuantity: 0,
    };
  }

  return state;
};

const useStore = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addToCart = (product) => {
    // TODO: Add logic here and remove modification from dispatch
    dispatch({ type: actions.ADD_TO_CART, product });
  };

  const removeFromCart = (product) => {
    // TODO: Add logic here and remove modification from dispatch
    dispatch({ type: actions.REMOVE_FROM_CART, product });
  };

  const clearCart = () => {
    dispatch({ type: actions.CLEAR_CART });
  };
  const addProduct = async (product) => {
    try {
        await fetch(`${import.meta.env.VITE_API_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(product),
      });


      // Nếu thành công, dispatch để cập nhật local state
      dispatch({ type: actions.ADD_PRODUCT, product: product});

      toast.success("Product added successfully!");
    } catch (error) {
      console.error("Add Product Error:", error);
      toast.error("Failed to add product");
    }
  };
  const getProducts = () => {
    fetch(`${import.meta.env.VITE_API_URL}/products`)
      .then(async (response) => {
        const data = await response.json();
        let modifiedData = data.map((product) => {
          return { ...product, addedToCart: false };
        });
        let cart = (await localforage.getItem("cartItems")) || [];
        dispatch({
          type: actions.GET_PRODUCTS,
          products: modifiedData,
          backed_up_cart: cart,
        });
      })
      .catch((err) => {
        toast.error(
          "There was a problem fetching products, check your internet connection and try again"
        );
        return [];
      });
  };
  const getProductsByPage = async (page = 0, size = 9) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/products?page=${page}&size=${size}`
      );
      const data = await response.json();
  
      const productsWithFlag = data.content.map((product) => ({
        ...product,
        addedToCart: false,
      }));
  
      dispatch({
        type: actions.GET_PRODUCTS,
        products: productsWithFlag,
        backed_up_cart: [],
      });
  
      return data; 
    } catch (error) {
      toast.error("Error fetching paginated products");
      return null;
    }
  };
  
  
  
  const addQuantity = (product) => {
    dispatch({ type: actions.ADD_QUANTITY, product });
  };

  const reduceQuantity = (product) => {
    dispatch({ type: actions.REDUCE_QUANTITY, product });
  };

  const confirmOrder = async (order) => {
    let payload = {
      items: state.cart,
      totalItemCount: state.cartQuantity,
      delivery_type: order.DeliveryType,
      delivery_type_cost: order.DeliveryTypeCost,
      cost_before_delivery_rate: state.cartTotal,
      cost_after_delivery_rate: order.costAfterDelieveryRate,
      promo_code: order.promo_code || "",
      contact_number: order.phoneNumber,
      user_id: order.user_id,
      paymentMethod: order.paymentMethod,
    };

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/order/place-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    if (data.error) {
      toast.error("You must be logged in to place an order");
      return { showRegisterLogin: true };
    }

    if (order.paymentMethod === "VNPAY") {
      const amount = order.costAfterDelieveryRate * 1000000;
      const paymentRes = await fetch(
          `${import.meta.env.VITE_API_URL}/payment/create-payment?amount=${amount}`,
          {
            method: "GET",
            credentials: "include",
          }
      );

      const paymentData = await paymentRes.json();

      if (paymentData.url) {
        window.location.href = paymentData.url;
      }else {
        toast.error("Không thể tạo link thanh toán VNPay");
      }
      return ;
    }

    toast.success("Order successful. Pls check your email");
    clearCart();
    return true;
  };

  return {
    state,
    addToCart,
    removeFromCart,
    clearCart,
    // getProducts,
    addProduct,
    addQuantity,
    reduceQuantity,
    getProductsByPage,
    confirmOrder,
  };
};

export default useStore;
