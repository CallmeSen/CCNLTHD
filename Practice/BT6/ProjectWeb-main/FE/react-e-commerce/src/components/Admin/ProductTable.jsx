import { useState, useEffect} from "react";
import { useGlobalContext } from "@/components/GlobalContext/GlobalContext";
import Pagination from "@/components/Pagination/Pagination";
import CreateProductModal from "./CreateProductModal";
const ProductTable = () => {
  const { store } = useGlobalContext();
  const [openModal, setOpenModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // 0-based index
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    const productsPerPage = 9;
  
    useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        const res = await store.getProductsByPage(currentPage + 1, productsPerPage);
        if (res?.totalPages) {
          setTotalPages(res.totalPages);
        }
        setLoading(false);
      };
  
      fetchData();
    }, [currentPage]);
  
    const handlePageClick = (event) => {
      setCurrentPage(event.selected);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Product Table</h2>
        <button
          onClick={() => setOpenModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + New Product
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-orange-500 text-white">
            <tr>
              <th className="px-6 py-3 text-left">#</th>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">Price ($)</th>
              <th className="px-6 py-3 text-left">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {store.state.products.map((p, index) => (
              <tr key={p.id} className="hover:bg-orange-50 transition">
                <td className="px-6 py-4">{index + 1}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                <td className="px-6 py-4">{p.category}</td>
                <td className="px-6 py-4">${p.price.toFixed(2)}</td>
                <td className="px-6 py-4">{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageClick}
      />
      <CreateProductModal isOpen={openModal} onClose={() => setOpenModal(false)} />
    </div>
  );
};

export default ProductTable;
