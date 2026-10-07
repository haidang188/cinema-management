USE cinema_management;

START TRANSACTION;

SET @employee_role_id := (
  SELECT id
  FROM roles
  WHERE name = 'EMPLOYEE'
  LIMIT 1
);

INSERT INTO users (username, password, role_id) VALUES
('nguyenvana', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('tranthibich', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('leminhcuong', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('phamthuha', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('hoangquocbao', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('vothanhdat', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('dangmaiphuong', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('buituananh', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('dothikimngan', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('ngophuclong', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id)
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id);

INSERT INTO employees (
  user_id,
  employee_code,
  full_name,
  email,
  phone,
  date_of_birth,
  gender,
  address,
  position,
  avatar,
  status,
  created_at,
  updated_at
) VALUES
((SELECT id FROM users WHERE username = 'nguyenvana'), 'NV001', 'Nguyễn Văn An', 'nguyenvana@cinema.local', '0901234567', '1998-03-12', 'MALE', 'Hải Châu, Đà Nẵng', 'Nhân viên bán vé', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'tranthibich'), 'NV002', 'Trần Thị Bích', 'tranthibich@cinema.local', '0912345678', '1999-07-25', 'FEMALE', 'Thanh Khê, Đà Nẵng', 'Nhân viên quầy bắp nước', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'leminhcuong'), 'NV003', 'Lê Minh Cường', 'leminhcuong@cinema.local', '0923456789', '1997-11-08', 'MALE', 'Sơn Trà, Đà Nẵng', 'Nhân viên soát vé', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'phamthuha'), 'NV004', 'Phạm Thu Hà', 'phamthuha@cinema.local', '0934567890', '2000-01-19', 'FEMALE', 'Cẩm Lệ, Đà Nẵng', 'Nhân viên chăm sóc khách hàng', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'hoangquocbao'), 'NV005', 'Hoàng Quốc Bảo', 'hoangquocbao@cinema.local', '0945678901', '1996-05-03', 'MALE', 'Liên Chiểu, Đà Nẵng', 'Tổ trưởng ca', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'vothanhdat'), 'NV006', 'Võ Thành Đạt', 'vothanhdat@cinema.local', '0956789012', '1998-09-14', 'MALE', 'Ngũ Hành Sơn, Đà Nẵng', 'Kỹ thuật phòng chiếu', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'dangmaiphuong'), 'NV007', 'Đặng Mai Phương', 'dangmaiphuong@cinema.local', '0967890123', '2001-12-01', 'FEMALE', 'Hải Châu, Đà Nẵng', 'Nhân viên bán vé', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'buituananh'), 'NV008', 'Bùi Tuấn Anh', 'buituananh@cinema.local', '0978901234', '1995-04-22', 'MALE', 'Thanh Khê, Đà Nẵng', 'Nhân viên an ninh', NULL, 'INACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'dothikimngan'), 'NV009', 'Đỗ Thị Kim Ngân', 'dothikimngan@cinema.local', '0989012345', '1999-10-30', 'FEMALE', 'Sơn Trà, Đà Nẵng', 'Kế toán ca', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'ngophuclong'), 'NV010', 'Ngô Phúc Long', 'ngophuclong@cinema.local', '0990123456', '1997-06-17', 'OTHER', 'Cẩm Lệ, Đà Nẵng', 'Nhân viên kho', NULL, 'INACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  user_id = VALUES(user_id),
  full_name = VALUES(full_name),
  email = VALUES(email),
  phone = VALUES(phone),
  date_of_birth = VALUES(date_of_birth),
  gender = VALUES(gender),
  address = VALUES(address),
  position = VALUES(position),
  avatar = VALUES(avatar),
  status = VALUES(status),
  updated_at = NOW();

COMMIT;
