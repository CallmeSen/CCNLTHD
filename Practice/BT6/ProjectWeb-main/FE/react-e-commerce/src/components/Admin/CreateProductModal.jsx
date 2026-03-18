import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { useGlobalContext } from "@/components/GlobalContext/GlobalContext";
import { toast } from "react-toastify";

const CreateProductModal = ({ isOpen, onClose }) => {
  const { store } = useGlobalContext();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    productCode: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.description) {
      toast.warning("Please fill in all required fields");
      return;
    }

    const product = {
      ...formData,
      price: parseFloat(formData.price),
      rating: parseInt(formData.rating),
      addedToCart: false,
    };

    await store.addProduct(product);
    onClose(); // Đóng modal sau khi thêm
    setFormData({ name: "", description: "", price: "", image: "", productCode: ""});
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen bg-black bg-opacity-40">
        <Dialog.Panel className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
          <Dialog.Title className="text-xl font-bold mb-4">Create Product</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Name"
                   className="w-full border p-2 rounded"/>
            <input name="description" value={formData.description} onChange={handleChange} placeholder="Description"
                   className="w-full border p-2 rounded"/>
            <input name="price" type="number" value={formData.price} onChange={handleChange} placeholder="Price"
                   className="w-full border p-2 rounded"/>
            <input name="image" value={formData.image} onChange={handleChange} placeholder="Image URL"
                   className="w-full border p-2 rounded"/>
            <input name="productCode" value={formData.productCode} onChange={handleChange} placeholder="Product Code"
                   className="w-full border p-2 rounded"/>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CreateProductModal;
