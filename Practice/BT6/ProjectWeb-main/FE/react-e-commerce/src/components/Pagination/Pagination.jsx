import React from "react";
import ReactPaginate from "react-paginate";
// import "./Pagination.css";
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <ReactPaginate
      previousLabel={"Previous"}
      nextLabel={"Next"}
      breakLabel={"..."}
      pageCount={totalPages}
      marginPagesDisplayed={2}
      pageRangeDisplayed={3}
      onPageChange={onPageChange}
      containerClassName="flex justify-center mt-4"
      pageClassName="mx-1"
      pageLinkClassName="px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-200 transition"
      previousClassName="mx-1"
      previousLinkClassName="px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-200 transition"
      nextClassName="mx-1"
      nextLinkClassName="px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-200 transition"
      breakClassName="mx-1"
      breakLinkClassName="px-3 py-2 border rounded-lg text-gray-500"
      activeClassName="text-white border-blue-500"
      forcePage={currentPage}
    />
  );
};

export default Pagination;
