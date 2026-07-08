package Shareview.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * Upload file to Cloudinary
     * @param file The file to upload
     * @param folder The folder name (images, documents, videos)
     * @return The secure URL of the uploaded file
     */
    public String uploadFile(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String resourceType = getResourceType(folder);
        String originalFilename = file.getOriginalFilename(); // e.g. "report.docx"

        Map<String, Object> uploadParams = ObjectUtils.asMap(
                "folder", "shareview/" + folder,
                "resource_type", resourceType,
                "use_filename", true,
                "unique_filename", true
        );

        // CRITICAL: byte[] uploads have no filename Cloudinary can detect on its own.
        // filename_override tells it explicitly what to base use_filename on.
        if (originalFilename != null && !originalFilename.isBlank()) {
            uploadParams.put("filename_override", originalFilename);
        }

        if ("image".equals(resourceType)) {
            uploadParams.put("quality", "auto");
            uploadParams.put("fetch_format", "auto");
        } else if ("video".equals(resourceType)) {
            uploadParams.put("quality", "auto");
        }

        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), uploadParams);

        return (String) uploadResult.get("secure_url");
    }

    /**
     * Delete file from Cloudinary
     * @param publicId The public ID of the file to delete
     * @param resourceType The resource type (image, video, raw)
     */
    public void deleteFile(String publicId, String resourceType) throws IOException {
        Map params = ObjectUtils.asMap("resource_type", resourceType);
        cloudinary.uploader().destroy(publicId, params);
    }

    /**
     * Extract public ID from Cloudinary URL
     * @param url The Cloudinary URL
     * @return The public ID
     */
    public String extractPublicId(String url) {
        if (url == null || !url.contains("cloudinary.com")) {
            return null;
        }

        // Extract public ID from URL
        // Example: https://res.cloudinary.com/demo/image/upload/v1234567/shareview/images/file.jpg
        // Public ID would be: shareview/images/file
        
        try {
            String[] parts = url.split("/upload/");
            if (parts.length < 2) return null;
            
            String afterUpload = parts[1];
            // Remove version number if present (v1234567/)
            afterUpload = afterUpload.replaceFirst("v\\d+/", "");
            
            // Remove file extension
            int lastDot = afterUpload.lastIndexOf('.');
            if (lastDot > 0) {
                afterUpload = afterUpload.substring(0, lastDot);
            }
            
            return afterUpload;
        } catch (Exception e) {
            System.err.println("Failed to extract public ID from URL: " + url);
            return null;
        }
    }

    /**
     * Determine resource type based on folder name
     */
    private String getResourceType(String folder) {
        switch (folder.toLowerCase()) {
            case "images":
                return "image";
            case "videos":
                return "video";
            case "documents":
            default:
                return "raw"; // For documents and other files
        }
    }

    /**
     * Get file info from Cloudinary
     */
    public Map getFileInfo(String publicId, String resourceType) throws Exception {
        return cloudinary.api().resource(publicId, 
            ObjectUtils.asMap("resource_type", resourceType));
    }
}