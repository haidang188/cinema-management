package com.cinemamanagement.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class UploadResourceConfig
        implements WebMvcConfigurer {

    private final Path uploadBaseDir;

    public UploadResourceConfig(
            @Value("${app.upload.base-dir:uploads}")
            String uploadBaseDir
    ) {
        this.uploadBaseDir =
                Paths.get(uploadBaseDir)
                        .toAbsolutePath()
                        .normalize();
    }

    @Override
    public void addResourceHandlers(
            ResourceHandlerRegistry registry
    ) {

        String resourceLocation =
                uploadBaseDir
                        .toUri()
                        .toString();

        if (!resourceLocation.endsWith("/")) {
            resourceLocation += "/";
        }

        registry
                .addResourceHandler("/uploads/**")
                .addResourceLocations(resourceLocation);
    }
}