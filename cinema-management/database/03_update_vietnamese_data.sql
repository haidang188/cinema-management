SET NAMES utf8mb4;

-- DB live hiện có 10 thể loại chính và một số thể loại trùng không dấu.
-- Đổi nhóm trùng trước để tránh lỗi unique key với collation tiếng Việt.
UPDATE genres SET name = CONCAT('Thể loại cũ ', id) WHERE id BETWEEN 11 AND 20;

UPDATE genres SET name = 'Hành động' WHERE id = 1;
UPDATE genres SET name = 'Phiêu lưu' WHERE id = 2;
UPDATE genres SET name = 'Hoạt hình' WHERE id = 3;
UPDATE genres SET name = 'Tâm lý' WHERE id = 4;
UPDATE genres SET name = 'Giả tưởng' WHERE id = 5;
UPDATE genres SET name = 'Kinh dị' WHERE id = 6;
UPDATE genres SET name = 'Khoa học viễn tưởng' WHERE id = 7;
UPDATE genres SET name = 'Giật gân' WHERE id = 8;
UPDATE genres SET name = 'Tình cảm' WHERE id = 9;
UPDATE genres SET name = 'Hài' WHERE id = 10;

UPDATE movies SET
  title = 'Dune: Hành Tinh Cát - Phần Hai',
  description = 'Paul Atreides liên minh với Chani và người Fremen để trả thù những kẻ đã hủy hoại gia tộc mình, đồng thời đối mặt lựa chọn có thể thay đổi vận mệnh thiên hà.',
  language = 'Tiếng Anh'
WHERE id = 1;

UPDATE movies SET
  title = 'Những Mảnh Ghép Cảm Xúc 2',
  description = 'Riley bước vào tuổi thiếu niên, kéo theo sự xuất hiện của nhiều cảm xúc mới khiến tổng hành dinh trở nên hỗn loạn và đáng yêu hơn bao giờ hết.',
  language = 'Tiếng Anh'
WHERE id = 2;

UPDATE movies SET
  title = 'Godzilla x Kong: Đế Chế Mới',
  description = 'Godzilla và Kong phải đối đầu một hiểm họa khổng lồ đang trỗi dậy từ sâu trong Trái Đất Rỗng, đe dọa sự tồn vong của cả hai giống loài.',
  language = 'Tiếng Anh'
WHERE id = 3;

UPDATE movies SET
  title = 'Furiosa: Câu Chuyện Từ Max Điên',
  description = 'Bị bắt khỏi quê hương khi còn nhỏ, Furiosa phải sống sót giữa vùng đất hoang tàn và tìm đường trở về nơi mình thuộc về.',
  language = 'Tiếng Anh'
WHERE id = 4;

UPDATE movies SET
  title = 'Vùng Đất Câm Lặng: Ngày Một',
  description = 'Một người phụ nữ phải tìm cách sống sót trong những giờ đầu tiên của cuộc xâm lăng bí ẩn, khi âm thanh trở thành mối nguy chết người.',
  language = 'Tiếng Anh'
WHERE id = 5;

UPDATE movies SET
  title = 'Kung Fu Panda 4',
  description = 'Po chuẩn bị trở thành thủ lĩnh tinh thần của Thung lũng Bình Yên và phải huấn luyện một chiến binh mới trước hiểm họa đang đến gần.',
  language = 'Tiếng Anh'
WHERE id = 6;

UPDATE cinema_rooms SET name = 'Phòng A1' WHERE id = 1;
UPDATE cinema_rooms SET name = 'Phòng IMAX B1' WHERE id = 2;
UPDATE cinema_rooms SET name = 'Phòng VIP C1' WHERE id = 3;
