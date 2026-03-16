import "./ShopFooter.css";
import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import thongbao from "../../assets/images/logoSaleNoti.png"; // icon "Đã thông báo BCT"
import thanhtoan from "../../assets/images/icon-thanh-toan.png"; // ảnh các icon thanh toán

const ShopFooter = () => {
  const year = new Date().getFullYear();
  return (
    <div className="footer-wrapper">
      <div className="footer-main">
        <div className="footer-col support">
          <h4>Hỗ Trợ</h4>
          <button>ĐĂNG KÝ NHẬN EMAIL</button>
          <button>KIỂM TRA ĐƠN HÀNG</button>
          <img src={thongbao} alt="Bộ Công Thương" className="thongbao-img" />
        </div>

        <div className="footer-col store-info">
          <h4>CỬA HÀNG Headphone</h4>
          <p>Hộ Kinh Doanh</p>
          <p>Mã số ĐKKD : 41C8027237 cấp ngày 05/04/2023</p>
          <p>Nơi cấp: Phòng Kinh Tế UBND  HCM</p>
          <p>Mã số người nộp thuế : 123456789</p>
          <p>ĐC: SGU</p>
          <p>Tel: <span className="highlight">123456789</span></p>
          <p>Email: cskh@sgu.vn</p>
        </div>

        <div className="footer-col">
          <h4>Về Chúng Tôi</h4>
          <Link to="/">Chính Sách Thanh Toán</Link>
          <Link to="/">Chính Sách Vận Chuyển</Link>
          <Link to="/">Chính Sách Đổi Trả</Link>
          <Link to="/">Quy Định Sử Dụng</Link>
          <Link to="/">Chúng Tôi Là Ai</Link>
          <Link to="/">Tuyển Dụng</Link>
        </div>

        <div className="footer-col">
          <h4>Chăm Sóc Khách Hàng</h4>
          <Link to="/">Hướng Dẫn Mua Hàng</Link>
          <Link to="/">Kiểm Hàng - Đổi Trả - Bảo Hành</Link>
          <Link to="/">Kích Cỡ Size</Link>
          <Link to="/">Hỏi Đáp</Link>
        </div>

        <div className="footer-col">
          <h4>Thanh Toán</h4>
          <img src={thanhtoan} alt="Phương thức thanh toán" className="pay-img" />
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          Điều Khoản & Điều Kiện | Chính Sách Bảo Mật | Liên Hệ | Sitemap | Copyright {year} 
        </p>
        <img src={logo} alt="logo" className="footer-logo" />
      </div>
    </div>
  );
};

export default ShopFooter;
