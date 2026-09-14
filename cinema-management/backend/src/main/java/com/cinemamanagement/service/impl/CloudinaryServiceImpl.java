package com.cinemamanagement.service.impl;

import com.cinemamanagement.exception.BadRequestException;
import com.cloudinary.Cloudinary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Set;

@Service
public class CloudinaryServiceImpl implements com.cinemamanagement.service.CloudinaryService {
    private static final long MAX_IMAGE_SIZE = 5L * 1024L * 1024L;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final Cloudinary cloudinary;

    public CloudinaryServiceImpl(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @Override
    public String uploadImage(MultipartFile file, String folder) {
        validateImage(file);

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), Map.of(
                    "folder", folder,
                    "resource_type", "image"
            ));
            Object secureUrl = uploadResult.get("secure_url");
            if (secureUrl == null || secureUrl.toString().isBlank()) {
                throw new BadRequestException("Cloudinary không trả về URL ảnh");
            }
            return secureUrl.toString();
        } catch (IOException exception) {
            throw new BadRequestException("Không đọc được file ảnh");
        } catch (RuntimeException exception) {
            throw new BadRequestException("Upload ảnh lên Cloudinary thất bại");
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ảnh");
        }

        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BadRequestException("Ảnh không được vượt quá 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Ảnh chỉ hỗ trợ JPG, PNG hoặc WebP");
        }

        if (!hasAllowedImageSignature(file, contentType)) {
            throw new BadRequestException("File không phải ảnh hợp lệ");
        }
    }

    private boolean hasAllowedImageSignature(MultipartFile file, String contentType) {
        byte[] header = new byte[12];
        try (InputStream inputStream = file.getInputStream()) {
            int bytesRead = inputStream.read(header);
            if (bytesRead < 4) {
                return false;
            }
        } catch (IOException exception) {
            throw new BadRequestException("Không đọc được file ảnh");
        }

        if ("image/jpeg".equals(contentType)) {
            return (header[0] & 0xff) == 0xff && (header[1] & 0xff) == 0xd8 && (header[2] & 0xff) == 0xff;
        }

        if ("image/png".equals(contentType)) {
            return (header[0] & 0xff) == 0x89
                    && header[1] == 0x50
                    && header[2] == 0x4e
                    && header[3] == 0x47;
        }

        return "image/webp".equals(contentType)
                && header[0] == 0x52
                && header[1] == 0x49
                && header[2] == 0x46
                && header[3] == 0x46
                && header[8] == 0x57
                && header[9] == 0x45
                && header[10] == 0x42
                && header[11] == 0x50;
    }
}
