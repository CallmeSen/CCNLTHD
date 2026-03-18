import { Link, Outlet } from "react-router-dom";
import { Package, Users, ShoppingCart } from "lucide-react";

const AdminView = () => {
  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6 text-blue-600">Admin Panel</h2>
        <nav className="space-y-4">
          <Link
            to="/dashboard/product"
            className="flex items-center gap-3 text-gray-700 hover:text-blue-600"
          >
            <Package size={20} />
            Products
          </Link>
          <Link
            to="/dashboard/orders"
            className="flex items-center gap-3 text-gray-700 hover:text-blue-600"
          >
            <ShoppingCart size={20} />
            Orders
          </Link>
          <Link
            to="/dashboard/users"
            className="flex items-center gap-3 text-gray-700 hover:text-blue-600"
          >
            <Users size={20} />
            Users
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          <div className="text-sm text-gray-600">Welcome, Admin</div>
        </header>

        {/* Page Content */}
        <main className="p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminView;
