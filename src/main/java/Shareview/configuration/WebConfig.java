package Shareview.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Get the absolute path to the uploads directory
        String uploadsDir = Paths.get("uploads").toAbsolutePath().toString();
        
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadsDir + "/");
    }
}