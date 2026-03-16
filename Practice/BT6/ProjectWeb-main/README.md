
# 🧑‍💻 Frontend - React E-Commerce

Đây là phần giao diện người dùng của hệ thống thương mại điện tử, được xây dựng bằng **React**, sử dụng **Vite** để build và **Tailwind CSS** cho giao diện hiện đại.

---

## 📦 Công nghệ sử dụng

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- React Router DOM
- Axios
- Docker

---

## 📁 Cấu trúc thư mục

```
react-e-commerce/
├── public/                      # Tài nguyên tĩnh (favicon, ảnh, v.v.)
├── src/
│   ├── assets/                  # Hình ảnh, icon
│   ├── components/              # Các component dùng chung
│   ├── pages/                   # Các trang chính: Home, Product, Cart, Login, ...
│   ├── routes/                  # Định nghĩa route cho ứng dụng
│   ├── services/                # Gọi API backend bằng axios
│   ├── context/                 # Context API (Auth, Cart, ...)
│   ├── App.jsx                  # Gốc ứng dụng React
│   └── main.jsx                 # Điểm khởi động chính của Vite
├── .env                         # Biến môi trường (nếu dùng)
├── index.html                   # Template HTML chính
├── tailwind.config.js           # Cấu hình Tailwind
├── vite.config.js               # Cấu hình Vite
├── Dockerfile                   # Docker hóa frontend
└── package.json                 # Danh sách dependency
```

---

## 🚀 Cách chạy frontend

### ⚙️ Cài đặt

```bash
cd FE/react-e-commerce
npm install
```

### ▶️ Chạy development

```bash
npm run dev
```

> Ứng dụng sẽ chạy tại `http://localhost:5173`

---

### 🐳 Chạy bằng Docker (tuỳ chọn)

```bash
docker build -t react-ecommerce .
docker run -p 5173:5173 react-ecommerce
```

---

## 🛠️ Các tính năng đang phát triển

- [ ] Đăng nhập/Đăng ký người dùng
- [ ] Giỏ hàng
- [ ] Trang chi tiết sản phẩm
- [ ] Thanh toán
- [ ] Trang quản trị

---

## 📬 Liên hệ

Nếu bạn có góp ý hoặc muốn đóng góp, hãy tạo Pull Request hoặc liên hệ qua GitHub.

