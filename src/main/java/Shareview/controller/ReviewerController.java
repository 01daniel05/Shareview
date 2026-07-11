package Shareview.controller;

import Shareview.dto.ReviewerGenerateRequest;
import Shareview.model.Reviewer;
import Shareview.repository.ReviewerRepository;
import Shareview.service.AIReviewerService;
import Shareview.service.ReviewerFileService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reviewer")
public class ReviewerController {

    private final ReviewerFileService reviewerFileService;
    private final AIReviewerService aiReviewerService;

    @Autowired
    private ReviewerRepository reviewerRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ReviewerController(ReviewerFileService reviewerFileService,
                              AIReviewerService aiReviewerService) {
        this.reviewerFileService = reviewerFileService;
        this.aiReviewerService = aiReviewerService;
    }

    @PostMapping("/extract-text")
    public ResponseEntity<?> extractText(@RequestParam("file") MultipartFile file) {
        try {
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

            // Map.of() throws NullPointerException if ANY value is null.
            // sourceFileUrl/Name/Type are legitimately null when the user pastes
            // text instead of uploading a file, so we use a null-tolerant map here.
            Map<String, Object> responseBody = new java.util.LinkedHashMap<>();
            responseBody.put("status", "success");
            responseBody.put("items", items);
            responseBody.put("sourceFileUrl", request.getSourceFileUrl());
            responseBody.put("sourceFileName", request.getSourceFileName());
            responseBody.put("sourceFileType", request.getSourceFileType());
            responseBody.put("message", "Reviewer generated successfully");

            return ResponseEntity.ok(responseBody);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", e.getMessage() != null ? e.getMessage() : "Unknown error occurred while generating reviewer."
            ));
        }
    }

    @GetMapping("/test")
    public ResponseEntity<?> test() {
        return ResponseEntity.ok(Map.of("status", "reviewer controller works"));
    }

    @PostMapping("/save")
    public ResponseEntity<?> saveReviewer(@RequestBody Map<String, Object> body) throws Exception {
        Reviewer reviewer = new Reviewer();
        reviewer.setUserId(Long.valueOf(body.get("userId").toString()));
        reviewer.setType((String) body.get("type"));
        reviewer.setItemsJson(objectMapper.writeValueAsString(body.get("items")));
        reviewer.setStyle((String) body.get("style"));
        reviewer.setDifficulty((String) body.get("difficulty"));
        reviewer.setSourceFileName((String) body.get("sourceFileName"));
        reviewer.setSourceFileType((String) body.get("sourceFileType"));
        reviewer.setSourceFileUrl((String) body.get("sourceFileUrl"));
        reviewer.setDescription((String) body.get("description"));

        Reviewer saved = reviewerRepository.save(reviewer);
        return ResponseEntity.ok(Map.of("status", "success", "id", saved.getId()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserReviewers(@PathVariable Long userId) {
        List<Reviewer> reviewers = reviewerRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(reviewers);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReviewer(@PathVariable Long id) {
        reviewerRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("status", "success"));
    }

    @PutMapping("/{id}/description")
    public ResponseEntity<?> updateDescription(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Reviewer reviewer = reviewerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reviewer not found"));
        reviewer.setDescription(body.get("description"));
        reviewerRepository.save(reviewer);
        return ResponseEntity.ok(Map.of("status", "success"));
    }
}