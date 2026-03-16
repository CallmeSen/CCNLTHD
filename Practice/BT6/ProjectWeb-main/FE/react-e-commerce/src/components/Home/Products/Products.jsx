import { useEffect, useState } from "react";
import Product from "./Product/Product";
import "./Products.css";
import { useGlobalContext } from "@/components/GlobalContext/GlobalContext";
import Skeleton from "react-loading-skeleton";
import Pagination from "@/components/Pagination/Pagination";

const Products = () => {
  const { store } = useGlobalContext();
  const [currentPage, setCurrentPage] = useState(0); // 0-based index
  const [totalPages, setTotalPages] = useState(1);
  const productsPerPage = 9;

  const [loading, setLoading] = useState(false);

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
      <div className="sub-container" id="products">
       <h2>Headphones For You</h2>
    { loading ? (
      <div className="contains-product">
        {Array.from({ length: productsPerPage }).map((_, i) => (
          <Skeleton key={i} height={250} width={"100%"} />
        ))}
      </div>
      ) : (
      <>
        <div className="contains-product">
          {store.state.products.map((product) => (
            <Product key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageClick={handlePageClick}
          />
        </div>
      </>
      )}
    </div>
  );
};

export default Products;


//Code nay dung de test
// import { useEffect, useState } from "react";
// import ReactPaginate from "react-paginate";
// import Product from "./Product/Product";
// import "./Products.css";
// import Skeleton from "react-loading-skeleton";

// // Mock product data (fake API response)
// const dummyProducts = Array.from({ length: 50 }, (_, i) => ({
//   id: i + 1,
//   name: `Product ${i + 1}`,
//   price: (Math.random() * 100).toFixed(2),
//   description: `This is a description for product ${i + 1}`,
//   image: `https://via.placeholder.com/300x200?text=Product+${i + 1}`,
// }));

// const Products = () => {
//   const [currentPage, setCurrentPage] = useState(0); // 0-based index
//   const [totalPages, setTotalPages] = useState(1);
//   const [displayedProducts, setDisplayedProducts] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const productsPerPage = 9;

//   useEffect(() => {
//     const fetchMockData = () => {
//       setLoading(true);
//       setTimeout(() => {
//         const start = currentPage * productsPerPage;
//         const end = start + productsPerPage;
//         const paginated = dummyProducts.slice(start, end);
//         setDisplayedProducts(paginated);
//         setTotalPages(Math.ceil(dummyProducts.length / productsPerPage));
//         setLoading(false);
//       }, 800); // Simulate delay
//     };

//     fetchMockData();
//   }, [currentPage]);

//   const handlePageClick = (event) => {
//     setCurrentPage(event.selected);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   return (
//     <div className="sub-container" id="products">
//       <h2>Headphones For You</h2>

//       {loading ? (
//         <div className="contains-product">
//           {Array.from({ length: productsPerPage }).map((_, i) => (
//             <Skeleton key={i} height={250} width={"100%"} />
//           ))}
//         </div>
//       ) : (
//         <>
//           <div className="contains-product">
//             {displayedProducts.map((product) => (
//               <Product key={product.id} product={product} />
//             ))}
//           </div>
//           <div className="mt-4 flex justify-center">
//           <ReactPaginate
//               previousLabel={"previous"}
//               nextLabel={"next"}
//               breakLabel={"..."}
//               pageCount={totalPages}
//               marginPagesDisplayed={2}
//               pageRangeDisplayed={3}
//               onPageChange={handlePageClick}
//               containerClassName={"pagination justify-content-center"}
//               pageClassName={"page-item"}
//               pageLinkClassName={"page-link"}
//               previousClassName={"page-item"}
//               previousLinkClassName={"page-link"}
//               nextClassName={"page-item"}
//               nextLinkClassName={"page-link"}
//               breakClassName={"page-item"}
//               breakLinkClassName={"page-link"}
//               activeClassName={"active"}
//               forcePage={currentPage}  
//             />

//           </div>
//         </>
//       )}
//     </div>
//   );
// };

// export default Products;
