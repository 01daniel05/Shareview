package Shareview.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/download")
public class DownloadController {

    @GetMapping
    public void downloadFile(@RequestParam String url,
                             @RequestParam String filename,
                             HttpServletResponse response) throws IOException {

        try {
            // Validate URL
            if (url == null || url.trim().isEmpty()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write("URL parameter is required");
                return;
            }

            // Clean up the URL
            String cleanUrl = url.trim();

            // For Cloudinary, ensure fl_attachment is present
            if (cleanUrl.contains("cloudinary.com") && !cleanUrl.contains("fl_attachment")) {
                String separator = cleanUrl.contains("?") ? "&" : "?";
                cleanUrl = cleanUrl + separator + "fl_attachment";
            }

            URL fileUrl = new URL(cleanUrl);
            HttpURLConnection connection = (HttpURLConnection) fileUrl.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(30000);

            int responseCode = connection.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
                response.getWriter().write("Failed to fetch file: " + responseCode);
                return;
            }

            // Get content type
            String contentType = connection.getContentType();
            if (contentType == null || contentType.isEmpty()) {
                contentType = "application/octet-stream";
            }

            // Set response headers
            response.setContentType(contentType);
            response.setHeader("Content-Disposition",
                    "attachment; filename=\"" + URLEncoder.encode(filename, StandardCharsets.UTF_8.toString()) + "\"");
            response.setHeader("Content-Length", String.valueOf(connection.getContentLength()));
            response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            response.setHeader("Pragma", "no-cache");
            response.setHeader("Expires", "0");

            // Write the file to response
            try (InputStream in = connection.getInputStream();
                 OutputStream out = response.getOutputStream()) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
                out.flush();
            }

        } catch (Exception e) {
            System.err.println("Download error: " + e.getMessage());
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.setContentType("text/plain");
            response.getWriter().write("Download failed: " + e.getMessage());
        }
    }
}