package com.cinemamanagement.service;

import com.cinemamanagement.exception.PromotionValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@Service
public class PromotionImageStorageService {

    private static final long MAX_FILE_SIZE =
            5L * 1024 * 1024;

    private final Path uploadBaseDir;

    public PromotionImageStorageService(
            @Value("${app.upload.base-dir:uploads}")
            String uploadBaseDir
    ) {
        this.uploadBaseDir =
                Paths.get(uploadBaseDir)
                        .toAbsolutePath()
                        .normalize();
    }

    public String save(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new PromotionValidationException(
                    "Du lieu khong hop le",
                    Map.of(
                            "image",
                            "Vui long chon anh khuyen mai"
                    )
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new PromotionValidationException(
                    "Du lieu khong hop le",
                    Map.of(
                            "image",
                            "Anh khuyen mai khong duoc vuot qua 5MB"
                    )
            );
        }

        String extension =
                extensionFor(file.getContentType());

        if (extension == null) {
            throw new PromotionValidationException(
                    "Du lieu khong hop le",
                    Map.of(
                            "image",
                            "Chi chap nhan anh JPG, PNG hoac WEBP"
                    )
            );
        }

        Path promotionsDir =
                uploadBaseDir
                        .resolve("promotions")
                        .normalize();

        String fileName =
                UUID.randomUUID() + extension;

        Path target =
                promotionsDir
                        .resolve(fileName)
                        .normalize();

        if (!target.startsWith(promotionsDir)) {
            throw new PromotionValidationException(
                    "Du lieu khong hop le",
                    Map.of(
                            "image",
                            "Duong dan tep khong hop le"
                    )
            );
        }

        try {

            Files.createDirectories(promotionsDir);

            try (InputStream inputStream =
                         file.getInputStream()) {

                Files.copy(
                        inputStream,
                        target,
                        StandardCopyOption.REPLACE_EXISTING
                );
            }

        } catch (IOException ex) {

            throw new IllegalStateException(
                    "Khong the luu anh khuyen mai",
                    ex
            );
        }

        return "/uploads/promotions/" + fileName;
    }

    public void deleteQuietly(String imageUrl) {

        if (imageUrl == null ||
                !imageUrl.startsWith(
                        "/uploads/promotions/"
                )) {
            return;
        }

        String fileName =
                imageUrl.substring(
                        "/uploads/promotions/".length()
                );

        Path promotionsDir =
                uploadBaseDir
                        .resolve("promotions")
                        .normalize();

        Path target =
                promotionsDir
                        .resolve(fileName)
                        .normalize();

        if (!target.startsWith(promotionsDir)) {
            return;
        }

        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
        }
    }

    private String extensionFor(String contentType) {

        if (contentType == null) {
            return null;
        }

        return switch (contentType.toLowerCase()) {

            case "image/jpeg",
                 "image/jpg" -> ".jpg";

            case "image/png" -> ".png";

            case "image/webp" -> ".webp";

            default -> null;
        };
    }
}