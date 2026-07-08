package Shareview.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Service
public class ReviewerFileService {

    private final CloudinaryService cloudinaryService;

    public ReviewerFileService(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

    /**
     * Extract text from file AND upload to Cloudinary
     * Returns both extracted text AND Cloudinary URL
     */
    public FileExtractResult extractTextAndUpload(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        // 1. Upload to Cloudinary
        String fileUrl = cloudinaryService.uploadFile(file, "reviewer_sources");

        if (fileUrl == null) {
            throw new IOException("Failed to upload file to Cloudinary");
        }

        // 2. Extract text from file
        String extractedText = extractText(file);

        // 3. Return both
        return new FileExtractResult(
                extractedText,
                fileUrl,
                file.getOriginalFilename(),
                file.getContentType(),
                file.getSize()
        );
    }

    /**
     * Extract text from file only
     */
    public String extractText(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename();

        if (filename == null) {
            throw new RuntimeException("Invalid file name.");
        }

        String lowerName = filename.toLowerCase();

        if (lowerName.endsWith(".pdf")) {
            return extractPdfText(file);
        }

        if (lowerName.endsWith(".docx")) {
            return extractDocxText(file);
        }

        if (lowerName.endsWith(".txt")) {
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        }

        throw new RuntimeException("Only .txt, .pdf, and .docx files are supported.");
    }

    private String extractPdfText(MultipartFile file) throws Exception {
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String extractDocxText(MultipartFile file) throws Exception {
        StringBuilder text = new StringBuilder();

        try (InputStream inputStream = file.getInputStream();
             XWPFDocument document = new XWPFDocument(inputStream)) {

            document.getParagraphs().forEach(paragraph ->
                    text.append(paragraph.getText()).append("\n")
            );
        }

        return text.toString();
    }

    /**
     * Delete reviewer file from Cloudinary
     */
    public void deleteReviewerFile(String fileUrl) throws Exception {
        String publicId = cloudinaryService.extractPublicId(fileUrl);
        if (publicId != null) {
            cloudinaryService.deleteFile(publicId, "raw");
            System.out.println("🗑️ Deleted reviewer file from Cloudinary: " + publicId);
        }
    }

    /**
     * Result class containing both extracted text and Cloudinary URL
     */
    public static class FileExtractResult {
        private final String text;
        private final String fileUrl;
        private final String fileName;
        private final String fileType;
        private final long fileSize;

        public FileExtractResult(String text, String fileUrl, String fileName,
                                 String fileType, long fileSize) {
            this.text = text;
            this.fileUrl = fileUrl;
            this.fileName = fileName;
            this.fileType = fileType;
            this.fileSize = fileSize;
        }

        public String getText() { return text; }
        public String getFileUrl() { return fileUrl; }
        public String getFileName() { return fileName; }
        public String getFileType() { return fileType; }
        public long getFileSize() { return fileSize; }
    }
}