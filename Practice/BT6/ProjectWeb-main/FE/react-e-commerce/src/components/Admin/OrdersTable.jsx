import { useEffect } from "react";
import useOrders from '../../store/orders';

const OrderTable = ({ userId }) => {
  const { state, getOrders, cancelOrder } = useOrders();

  useEffect(() => {
    getOrders(userId);
  }, [userId]);

  return (
    <div className="p-6 bg-white shadow-md rounded-xl">
      <h2 className="text-xl font-semibold mb-4">Order List</h2>
      <table className="w-full text-sm border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">#</th>
            <th className="p-2 border">Order ID</th>
            <th className="p-2 border">Items</th>
            <th className="p-2 border">Delivery</th>
            <th className="p-2 border">Total</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {state.orders.map((order, index) => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="p-2 border">{index + 1}</td>
              <td className="p-2 border">{order.id}</td>
              <td className="p-2 border">
                {order.items?.length} products
              </td>
              <td className="p-2 border">
                {order.delivery_type} (${order.delivery_type_cost})
              </td>
              <td className="p-2 border font-semibold text-green-600">
                ${order.cost_after_delivery_rate.toFixed(2)}
              </td>
              <td className="p-2 border">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === "Canceled"
                      ? "bg-red-100 text-red-500"
                      : order.status === "Completed"
                      ? "bg-green-100 text-green-600"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {order.status}
                </span>
              </td>
              <td className="p-2 border">
                {order.status !== "Canceled" && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="bg-red-500 text-white text-xs px-3 py-1 rounded hover:bg-red-600"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
          {state.orders.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center p-4 text-gray-500">
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
