package Shareview.controller;

import Shareview.dto.ReviewerGenerateRequest;
import Shareview.service.AIReviewerService;
import Shareview.service.ReviewerFileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/reviewer")
public class ReviewerController {

    private final ReviewerFileService reviewerFileService;
    private final AIReviewerService aiReviewerService;

    public ReviewerController(ReviewerFileService reviewerFileService,
                              AIReviewerService aiReviewerService) {
        this.reviewerFileService = reviewerFileService;
        this.aiReviewerService = aiReviewerService;
    }

    @PostMapping("/extract-text")
    public ResponseEntity<?> extractText(@RequestParam("file") MultipartFile file) {
        try {
            // ✅ Now FileExtractResult is available
            ReviewerFileService.FileExtractResult result =
                    reviewerFileService.extractTextAndUpload(file);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "text", result.getText(),
                    "fileUrl", result.getFileUrl(),
                    "fileName", result.getFileName(),
                    "fileType", result.getFileType(),
                    "fileSize", result.getFileSize(),
                    "message", "File uploaded to Cloudinary and text extracted successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateReviewer(@RequestBody ReviewerGenerateRequest request) {
        try {
            Object items = aiReviewerService.generateReviewer(request);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "items", items,
                    "sourceFileUrl", request.getSourceFileUrl(),
                    "sourceFileName", request.getSourceFileName(),
                    "sourceFileType", request.getSourceFileType(),
                    "message", "Reviewer generated successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/test")
    public ResponseEntity<?> test() {
        return ResponseEntity.ok(Map.of("status", "reviewer controller works"));
    }
}