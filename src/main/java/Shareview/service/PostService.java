package Shareview.service;

import Shareview.model.*;
import Shareview.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PostService {
    private final String UPLOAD_DIR = "uploads/";
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostLikeRepository postLikeRepository;
    private final SavedPostRepository savedPostRepository;
    private final PostReportRepository postReportRepository;

    public PostService(PostRepository postRepository,
                       UserRepository userRepository,
                       PostLikeRepository postLikeRepository,
                       SavedPostRepository savedPostRepository,
                       PostReportRepository postReportRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.postLikeRepository = postLikeRepository;
        this.savedPostRepository = savedPostRepository;
        this.postReportRepository = postReportRepository;
        createUploadDirectories();
    }

    // ============================================
    // FILE UPLOAD METHODS
    // ============================================

    private void createUploadDirectories() {
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR + "images"));
            Files.createDirectories(Paths.get(UPLOAD_DIR + "documents"));
            Files.createDirectories(Paths.get(UPLOAD_DIR + "videos"));
            System.out.println("Upload directories created successfully");
        } catch (IOException e) {
            System.err.println("Could not create upload directories: " + e.getMessage());
        }
    }

    private String saveFile(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String filename = System.currentTimeMillis() + "_" +
                (originalFilename != null ? originalFilename.replace(" ", "_") : "file");

        // Create the full path
        Path filePath = Paths.get(UPLOAD_DIR + folder + "/" + filename);

        // Save the file
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        System.out.println("File saved to: " + filePath.toAbsolutePath());

        // Return the URL path (not the filesystem path)
        return "/uploads/" + folder + "/" + filename;
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }

    // ============================================
    // POST CREATION WITH FILES
    // ============================================
    @Transactional
    public ResponseEntity<?> createPostWithMultipleFiles(String title, String content, Long userId,
                                                         MultipartFile[] images,
                                                         MultipartFile[] documents,
                                                         MultipartFile[] videos) {
        try {
            System.out.println("=== MULTIPLE FILE UPLOAD DEBUG ===");
            System.out.println("Title: " + title);
            System.out.println("Content: " + content);
            System.out.println("User ID: " + userId);
            System.out.println("Images: " + (images != null ? images.length : 0));
            System.out.println("Documents: " + (documents != null ? documents.length : 0));
            System.out.println("Videos: " + (videos != null ? videos.length : 0));

            // Validate input
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("status", "error", "message", "Title cannot be empty"));
            }

            if (content == null || content.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("status", "error", "message", "Content cannot be empty"));
            }

            Optional<User> userOptional = userRepository.findById(userId);
            if (userOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "User not found"));
            }

            Post post = new Post();
            post.setTitle(title.trim());
            post.setContent(content.trim());
            post.setUser(userOptional.get());

            List<String> allImageUrls = new ArrayList<>();
            List<String> allDocumentUrls = new ArrayList<>();
            List<String> allVideoUrls = new ArrayList<>();

            // Handle multiple images
            if (images != null && images.length > 0) {
                for (MultipartFile image : images) {
                    if (image != null && !image.isEmpty()) {
                        try {
                            String imageUrl = saveFile(image, "images");
                            allImageUrls.add(imageUrl);
                            System.out.println("✅ Image uploaded: " + imageUrl);
                        } catch (Exception e) {
                            System.err.println("❌ Failed to upload image: " + e.getMessage());
                        }
                    }
                }
                if (!allImageUrls.isEmpty()) {
                    post.setImageUrls(String.join(",", allImageUrls));
                }
            }

            // Handle multiple documents
            if (documents != null && documents.length > 0) {
                for (MultipartFile document : documents) {
                    if (document != null && !document.isEmpty()) {
                        try {
                            String documentUrl = saveFile(document, "documents");
                            allDocumentUrls.add(documentUrl);
                            System.out.println("✅ Document uploaded: " + documentUrl);
                        } catch (Exception e) {
                            System.err.println("❌ Failed to upload document: " + e.getMessage());
                        }
                    }
                }
                if (!allDocumentUrls.isEmpty()) {
                    post.setDocumentUrls(String.join(",", allDocumentUrls));
                }
            }

            // Handle multiple videos
            if (videos != null && videos.length > 0) {
                for (MultipartFile video : videos) {
                    if (video != null && !video.isEmpty()) {
                        try {
                            String videoUrl = saveFile(video, "videos");
                            allVideoUrls.add(videoUrl);
                            System.out.println("✅ Video uploaded: " + videoUrl);
                        } catch (Exception e) {
                            System.err.println("❌ Failed to upload video: " + e.getMessage());
                        }
                    }
                }
                if (!allVideoUrls.isEmpty()) {
                    post.setVideoUrls(String.join(",", allVideoUrls));
                }
            }

            Post savedPost = postRepository.save(post);

            System.out.println("📊 Final post state:");
            System.out.println(" - Image URLs: " + savedPost.getImageUrls());
            System.out.println(" - Document URLs: " + savedPost.getDocumentUrls());
            System.out.println(" - Video URLs: " + savedPost.getVideoUrls());
            System.out.println(" - Total files: " + (allImageUrls.size() + allDocumentUrls.size() + allVideoUrls.size()));
            System.out.println("=====================");

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "status", "success",
                            "message", "Post created successfully",
                            "post", savedPost
                    ));

        } catch (Exception e) {
            System.err.println("💥 CRITICAL ERROR in createPostWithMultipleFiles:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to create post: " + e.getMessage()));
        }
    }
    // ============================================
    // EXISTING METHODS (keep all your current methods)
    // ============================================

    @Transactional
    public ResponseEntity<?> createPost(String title, String content, Long userId) {
        try {
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("status", "error", "message", "Title cannot be empty"));
            }

            if (content == null || content.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("status", "error", "message", "Content cannot be empty"));
            }

            Optional<User> userOptional = userRepository.findById(userId);
            if (userOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "User not found"));
            }

            Post post = new Post();
            post.setTitle(title.trim());
            post.setContent(content.trim());
            post.setUser(userOptional.get());

            Post savedPost = postRepository.save(post);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("status", "success", "message", "Post created successfully", "post", savedPost));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to create post: " + e.getMessage()));
        }
    }

    public ResponseEntity<?> getAllPosts() {
        try {
            List<Post> posts = postRepository.findAllWithUserOrderByCreatedAtDesc();
            System.out.println("Loaded " + posts.size() + " posts");
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to load posts: " + e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> updatePost(Long postId, String title, String content, Long userId) {
        try {
            Optional<Post> postOptional = postRepository.findById(postId);
            Optional<User> userOptional = userRepository.findById(userId);

            if (postOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post not found"));
            }

            if (userOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "User not found"));
            }

            Post post = postOptional.get();
            User user = userOptional.get();

            // Check if the user owns the post
            if (!post.getUser().getId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("status", "error", "message", "You can only edit your own posts"));
            }

            // Validate input
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("status", "error", "message", "Title cannot be empty"));
            }

            if (content == null || content.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("status", "error", "message", "Content cannot be empty"));
            }

            // Update post
            post.setTitle(title.trim());
            post.setContent(content.trim());

            Post updatedPost = postRepository.save(post);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Post updated successfully",
                    "post", updatedPost
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to update post: " + e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> deletePost(Long postId, Long userId) {
        try {
            Optional<Post> postOptional = postRepository.findById(postId);
            Optional<User> userOptional = userRepository.findById(userId);

            if (postOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post not found"));
            }

            if (userOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "User not found"));
            }

            Post post = postOptional.get();

            // Check if the user owns the post
            if (!post.getUser().getId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("status", "error", "message", "You can only delete your own posts"));
            }

            // Delete all likes for this post
            postLikeRepository.deleteByPostId(postId);

            // Delete all saves for this post
            savedPostRepository.deleteByPostId(postId);

            // Delete all reports for this post (if you have reports)
            // postReportRepository.deleteByPostId(postId);

            // Finally delete the post
            postRepository.delete(post);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Post deleted successfully"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to delete post: " + e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> reportPost(Long postId, Long userId, String reason) {
        try {
            Optional<Post> postOptional = postRepository.findById(postId);
            Optional<User> userOptional = userRepository.findById(userId);

            if (postOptional.isEmpty() || userOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post or user not found"));
            }

            Post post = postOptional.get();
            User user = userOptional.get();

            // Check if user already reported this post
            Optional<PostReport> existingReport = postReportRepository.findByUser_IdAndPost_Id(userId, postId);

            if (existingReport.isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("status", "error", "message", "You have already reported this post"));
            }

            // Create new report
            PostReport report = new PostReport();
            report.setPost(post);
            report.setUser(user);
            report.setReason(reason != null ? reason : "No reason provided");

            postReportRepository.save(report);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Post reported successfully"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to report post: " + e.getMessage()));
        }
    }

    public ResponseEntity<?> getUserPosts(Long userId) {
        try {
            List<Post> posts = postRepository.findByUser_IdOrderByCreatedAtDesc(userId);
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to load user posts"));
        }
    }

    public ResponseEntity<?> getSavedPosts(Long userId) {
        try {
            List<Post> savedPosts = postRepository.findSavedPostsByUserId(userId);
            return ResponseEntity.ok(savedPosts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to load saved posts"));
        }
    }

    public ResponseEntity<?> getLikedPosts(Long userId) {
        try {
            List<Post> likedPosts = postRepository.findLikedPostsByUserId(userId);
            return ResponseEntity.ok(likedPosts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to load liked posts"));
        }
    }

    @Transactional
    public ResponseEntity<?> toggleLike(Long postId, Long userId) {
        try {
            Optional<Post> postOptional = postRepository.findById(postId);
            Optional<User> userOptional = userRepository.findById(userId);

            if (postOptional.isEmpty() || userOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post or user not found"));
            }

            Post post = postOptional.get();
            User user = userOptional.get();

            Optional<PostLike> existingLike = postLikeRepository.findByUser_IdAndPost_Id(userId, postId);

            boolean isLiked;
            if (existingLike.isPresent()) {
                postLikeRepository.delete(existingLike.get());
                post.decrementLikes();
                isLiked = false;
            } else {
                PostLike newLike = new PostLike();
                newLike.setUser(user);
                newLike.setPost(post);
                postLikeRepository.save(newLike);
                post.incrementLikes();
                isLiked = true;
            }

            postRepository.save(post);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", isLiked ? "Post liked" : "Post unliked",
                    "isLiked", isLiked,
                    "likesCount", post.getLikesCount()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to toggle like"));
        }
    }

    @Transactional
    public ResponseEntity<?> toggleSave(Long postId, Long userId) {
        try {
            Optional<Post> postOptional = postRepository.findById(postId);
            Optional<User> userOptional = userRepository.findById(userId);

            if (postOptional.isEmpty() || userOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post or user not found"));
            }

            Post post = postOptional.get();
            User user = userOptional.get();

            Optional<SavedPost> existingSave = savedPostRepository.findByUser_IdAndPost_Id(userId, postId);

            boolean isSaved;
            if (existingSave.isPresent()) {
                savedPostRepository.delete(existingSave.get());
                isSaved = false;
            } else {
                SavedPost newSave = new SavedPost();
                newSave.setUser(user);
                newSave.setPost(post);
                savedPostRepository.save(newSave);
                isSaved = true;
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", isSaved ? "Post saved" : "Post unsaved",
                    "isSaved", isSaved
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to toggle save"));
        }
    }

    public ResponseEntity<?> getUserPostStatus(Long postId, Long userId) {
        try {
            boolean isLiked = postLikeRepository.existsByUser_IdAndPost_Id(userId, postId);
            boolean isSaved = savedPostRepository.existsByUser_IdAndPost_Id(userId, postId);

            Map<String, Object> response = new HashMap<>();
            response.put("isLiked", isLiked);
            response.put("isSaved", isSaved);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to get post status"));
        }
    }
}