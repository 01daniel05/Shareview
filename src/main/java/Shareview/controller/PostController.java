package Shareview.controller;

import Shareview.service.PostService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public ResponseEntity<?> getAllPosts() {
        return postService.getAllPosts();
    }
    // ============================================
    // MULTIPLE FILE UPLOAD ENDPOINTS
    // ============================================

    // New endpoint for multiple files of each type
    @PostMapping(value = "/multiple", consumes = {"multipart/form-data"})
    public ResponseEntity<?> createPostWithMultipleFiles(
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam("userId") Long userId,
            @RequestParam(value = "images", required = false) MultipartFile[] images,
            @RequestParam(value = "documents", required = false) MultipartFile[] documents,
            @RequestParam(value = "videos", required = false) MultipartFile[] videos) {

        return postService.createPostWithMultipleFiles(title, content, userId, images, documents, videos);
    }

    // Updated single file endpoint (converts to arrays for compatibility)
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createPostWithFiles(
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam("userId") Long userId,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "document", required = false) MultipartFile document,
            @RequestParam(value = "video", required = false) MultipartFile video) {

        // Convert single files to arrays for the service method
        MultipartFile[] images = image != null && !image.isEmpty() ? new MultipartFile[]{image} : null;
        MultipartFile[] documents = document != null && !document.isEmpty() ? new MultipartFile[]{document} : null;
        MultipartFile[] videos = video != null && !video.isEmpty() ? new MultipartFile[]{video} : null;

        return postService.createPostWithMultipleFiles(title, content, userId, images, documents, videos);
    }

    // For JSON posts (backward compatibility)
    @PostMapping(consumes = {"application/json"})
    public ResponseEntity<?> createPostJson(@RequestBody Map<String, String> request) {
        String title = request.get("title");
        String content = request.get("content");
        Long userId = Long.parseLong(request.get("userId"));
        return postService.createPost(title, content, userId);
    }

    @PutMapping("/{postId}")
    public ResponseEntity<?> updatePost(@PathVariable Long postId, @RequestBody Map<String, String> request) {
        String title = request.get("title");
        String content = request.get("content");
        Long userId = Long.parseLong(request.get("userId"));

        return postService.updatePost(postId, title, content, userId);
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<?> deletePost(@PathVariable Long postId, @RequestHeader("userId") Long userId) {
        return postService.deletePost(postId, userId);
    }

    @PostMapping("/{postId}/report")
    public ResponseEntity<?> reportPost(@PathVariable Long postId, @RequestBody Map<String, String> request) {
        Long userId = Long.parseLong(request.get("userId"));
        String reason = request.get("reason");
        return postService.reportPost(postId, userId, reason);
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<?> likePost(@PathVariable Long postId, @RequestBody Map<String, Long> request) {
        Long userId = request.get("userId");
        return postService.toggleLike(postId, userId);
    }

    @PostMapping("/{postId}/save")
    public ResponseEntity<?> savePost(@PathVariable Long postId, @RequestBody Map<String, Long> request) {
        Long userId = request.get("userId");
        return postService.toggleSave(postId, userId);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserPosts(@PathVariable Long userId) {
        return postService.getUserPosts(userId);
    }

    @GetMapping("/{postId}/status")
    public ResponseEntity<?> getPostStatus(@PathVariable Long postId, @RequestHeader("userId") Long userId) {
        return postService.getUserPostStatus(postId, userId);
    }
}