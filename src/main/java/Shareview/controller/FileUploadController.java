package Shareview.controller;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    @Autowired
    private Cloudinary cloudinary;

    @PostMapping("/reviewer-file")
    public ResponseEntity<?> uploadReviewerFile(@RequestParam("file") MultipartFile file) {
        try {
            // Upload to Cloudinary
            Map uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                    "folder", "reviewer_sources",
                    "resource_type", "raw" // For documents
                )
            );

            String fileUrl = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");

            // Also extract text from the file
            String extractedText = extractTextFromFile(file);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("fileUrl", fileUrl);
            response.put("publicId", publicId);
            response.put("fileName", file.getOriginalFilename());
            response.put("fileType", file.getContentType());
            response.put("extractedText", extractedText);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", "Failed to upload file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    private String extractTextFromFile(MultipartFile file) {
        try {
            String fileName = file.getOriginalFilename().toLowerCase();

            if (fileName.endsWith(".txt")) {
                return new String(file.getBytes(), StandardCharsets.UTF_8);
            } else if (fileName.endsWith(".pdf")) {
                // Use PDFBox or similar library
                // For now, return a placeholder
                return "PDF text extraction would go here";
            } else if (fileName.endsWith(".docx")) {
                // Use Apache POI or similar library
                return "DOCX text extraction would go here";
            } else {
                return "Unsupported file type for text extraction";
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "Failed to extract text";
        }
    }
}