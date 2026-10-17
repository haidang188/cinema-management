-- Premiere Cinemas
-- Cập nhật nội dung chi tiết cho 8 phim được thêm bởi seed 12.
-- Có thể chạy nhiều lần mà không phát sinh thêm dữ liệu.

USE cinema_management;
SET NAMES utf8mb4;

-- Workbench thường bật Safe Update Mode và không cho UPDATE theo cột title
-- vì title không phải khóa. Tạm tắt trong file rồi khôi phục ở cuối.
SET @previous_sql_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

UPDATE movies
SET description = 'Bốn con người bình thường bất ngờ bị cuốn qua một cánh cổng bí ẩn và lạc vào Overworld, thế giới kỳ lạ được tạo nên từ những khối vuông, nơi trí tưởng tượng quyết định khả năng sinh tồn. Để tìm đường trở về nhà, họ phải học cách khai thác tài nguyên, chế tạo công cụ và bảo vệ nhau trước những sinh vật nguy hiểm xuất hiện khi màn đêm buông xuống. Đồng hành cùng Steve, một thợ chế tạo giàu kinh nghiệm nhưng có phần lập dị, cả nhóm dần nhận ra rằng những phẩm chất từng khiến họ trở nên khác biệt ở thế giới thực lại chính là chìa khóa giúp họ hoàn thành cuộc phiêu lưu lớn nhất đời mình.'
WHERE title = 'A Minecraft Movie';

UPDATE movies
SET description = 'Lilo là một cô bé Hawaii thông minh, giàu tình cảm nhưng luôn cảm thấy lạc lõng sau những biến cố trong gia đình. Cuộc sống của cô thay đổi khi cô nhận nuôi Stitch, một sinh vật ngoài hành tinh được tạo ra cho mục đích phá hoại và đang chạy trốn khỏi những kẻ truy đuổi ngoài vũ trụ. Ban đầu, sự nghịch ngợm của Stitch khiến hai chị em Lilo gặp thêm vô số rắc rối, nhưng tình yêu thương chân thành đã dần cảm hóa cậu. Qua hành trình đầy hài hước và cảm xúc, cả hai hiểu rằng gia đình không nhất thiết phải hoàn hảo, miễn là không ai bị bỏ lại phía sau.'
WHERE title = 'Lilo & Stitch';

UPDATE movies
SET description = 'Trên đảo Berk khắc nghiệt, người Viking từ nhiều thế hệ đã xem loài rồng là kẻ thù nguy hiểm cần phải tiêu diệt. Hiccup, con trai của tù trưởng Stoick, lại không sở hữu sức mạnh và tính cách của một chiến binh truyền thống. Trong một lần tình cờ, cậu bắt gặp và bí mật cứu sống Toothless, một con rồng Night Fury hiếm có. Tình bạn giữa họ giúp Hiccup khám phá sự thật về loài rồng và đặt cậu trước lựa chọn khó khăn: tiếp tục truyền thống của bộ tộc hay đứng lên bảo vệ điều mình tin tưởng. Cuộc phiêu lưu của Hiccup và Toothless mở ra cơ hội chấm dứt cuộc chiến kéo dài giữa hai giống loài.'
WHERE title = 'Bí Kíp Luyện Rồng';

UPDATE movies
SET description = 'Năm năm sau những biến động làm thay đổi hệ sinh thái toàn cầu, phần lớn khủng long còn sống chỉ có thể tồn tại tại những vùng khí hậu biệt lập gần đường xích đạo. Zora Bennett, một chuyên gia hoạt động bí mật, được giao nhiệm vụ dẫn đầu đội thám hiểm tiến vào hòn đảo từng là cơ sở nghiên cứu của Công viên Kỷ Jura. Mục tiêu của họ là thu thập vật liệu di truyền từ ba sinh vật khổng lồ để phục vụ một bước đột phá y học. Tuy nhiên, khi nhiệm vụ giao nhau với một gia đình gặp nạn trên biển, cả nhóm phát hiện những thí nghiệm bị che giấu và phải đối mặt với các sinh vật nguy hiểm chưa từng được công bố.'
WHERE title = 'Jurassic World: Tái Sinh';

UPDATE movies
SET description = 'Clark Kent lớn lên tại Smallville với những giá trị nhân văn được cha mẹ nuôi truyền lại, nhưng trong anh luôn tồn tại sức mạnh và di sản của hành tinh Krypton. Khi thế giới bắt đầu hoài nghi về lòng tốt và những thế lực mới đe dọa Metropolis, Clark phải tìm cách dung hòa con người bình dị của mình với biểu tượng Superman mà mọi người kỳ vọng. Bên cạnh nữ phóng viên Lois Lane và những đồng minh đặc biệt, anh bước vào cuộc đối đầu không chỉ thử thách sức mạnh thể chất mà còn thử thách niềm tin vào công lý, lòng trắc ẩn và khả năng con người có thể lựa chọn làm điều đúng đắn.'
WHERE title = 'Superman';

UPDATE movies
SET description = 'Sonny Hayes từng được xem là tài năng triển vọng nhất của Formula 1 trước khi một tai nạn nghiêm trọng khiến sự nghiệp của anh rẽ sang hướng khác. Nhiều năm sau, người đồng đội cũ Ruben Cervantes thuyết phục Sonny trở lại để cứu APXGP, một đội đua đang đứng trước nguy cơ bị giải thể. Tại đây, anh phải hợp tác với Joshua Pearce, tay đua trẻ tài năng nhưng đầy kiêu hãnh và quyết tâm trở thành số một. Giữa tốc độ, áp lực truyền thông và những mâu thuẫn nội bộ, cả hai buộc phải học cách tin tưởng nhau nếu muốn đưa đội đua trở lại bục chiến thắng và tìm thấy cơ hội làm lại cuộc đời.'
WHERE title = 'F1: The Movie';

UPDATE movies
SET description = 'Stefani, một nữ sinh đại học, liên tục bị ám ảnh bởi cơn ác mộng về thảm họa kinh hoàng xảy ra tại một tòa tháp nhiều thập kỷ trước. Khi trở về nhà để tìm hiểu nguồn gốc những hình ảnh đó, cô phát hiện bà ngoại mình từng cứu nhiều người khỏi cái chết nhờ một linh cảm kỳ lạ. Nhưng việc thoát khỏi số phận đã tạo nên một món nợ kéo dài qua nhiều thế hệ, và giờ đây cái chết đang lần lượt tìm đến từng thành viên trong gia đình. Stefani phải giải mã quá khứ và tìm ra kẽ hở trong quy luật chết chóc trước khi toàn bộ huyết thống của cô bị xóa sổ.'
WHERE title = 'Final Destination: Bloodlines';

UPDATE movies
SET description = 'Sau khi Muzan Kibutsuji xuất hiện tại dinh thự Ubuyashiki, Tanjiro cùng các Trụ Cột lao vào trận chiến quyết định nhưng bất ngờ bị kéo xuống Vô Hạn Thành, pháo đài không gian do quỷ điều khiển. Bị chia cắt giữa mê cung luôn biến đổi, các kiếm sĩ diệt quỷ phải đối đầu với những Thượng Huyền mạnh nhất trong khi tìm đường hội quân. Mỗi trận chiến buộc họ phải vượt qua giới hạn thể chất, đối diện với ký ức đau thương và bảo vệ những người đồng đội còn lại. Đây là khởi đầu của cuộc quyết chiến cuối cùng nhằm chấm dứt triều đại kéo dài hàng thế kỷ của Muzan.'
WHERE title = 'Thanh Gươm Diệt Quỷ: Vô Hạn Thành';

SET SQL_SAFE_UPDATES = @previous_sql_safe_updates;

-- Kiểm tra kết quả sau khi cập nhật.
SELECT id, title, CHAR_LENGTH(description) AS description_length, description
FROM movies
WHERE title IN (
    'A Minecraft Movie',
    'Lilo & Stitch',
    'Bí Kíp Luyện Rồng',
    'Jurassic World: Tái Sinh',
    'Superman',
    'F1: The Movie',
    'Final Destination: Bloodlines',
    'Thanh Gươm Diệt Quỷ: Vô Hạn Thành'
)
ORDER BY title;
