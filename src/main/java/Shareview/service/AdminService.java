package Shareview.service;

import Shareview.model.*;
import Shareview.repository.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostReportRepository postReportRepository;
    private final PostLikeRepository postLikeRepository;
    private final SavedPostRepository savedPostRepository;
    private final ActivityLogRepository activityLogRepository;
    private final CloudinaryService cloudinaryService;

    public AdminService(UserRepository userRepository,
                        PostRepository postRepository,
                        CommentRepository commentRepository,
                        PostReportRepository postReportRepository,
                        PostLikeRepository postLikeRepository,
                        SavedPostRepository savedPostRepository,
                        ActivityLogRepository activityLogRepository,
                        CloudinaryService cloudinaryService) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postReportRepository = postReportRepository;
        this.postLikeRepository = postLikeRepository;
        this.savedPostRepository = savedPostRepository;
        this.activityLogRepository = activityLogRepository;
        this.cloudinaryService = cloudinaryService;
    }

    // ============================================
    // DASHBOARD STATISTICS
    // ============================================

    public ResponseEntity<?> getDashboardStats() {
        try {
            long totalUsers = userRepository.count();
            long activeUsers = userRepository.countByStatus("ACTIVE");
            long suspendedUsers = userRepository.countByStatus("SUSPENDED");

            long totalPosts = postRepository.count();
            long publishedPosts = postRepository.countByStatus("PUBLISHED");
            long flaggedPosts = postRepository.countByStatus("FLAGGED");

            long totalComments = commentRepository.count();
            long pendingReports = postReportRepository.countByStatus("PENDING");

            long totalActivities = activityLogRepository.count();
            long todayActivities = activityLogRepository.countByTimestampAfter(LocalDateTime.now().minusDays(1));

            Map<String, Object> stats = new HashMap<>();
            stats.put("users", Map.of(
                    "total", totalUsers,
                    "active", activeUsers,
                    "suspended", suspendedUsers
            ));
            stats.put("posts", Map.of(
                    "total", totalPosts,
                    "published", publishedPosts,
                    "flagged", flaggedPosts
            ));
            stats.put("comments", totalComments);
            stats.put("reports", pendingReports);
            stats.put("activities", Map.of(
                    "total", totalActivities,
                    "today", todayActivities
            ));
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "data", stats
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // ============================================
    // USER MANAGEMENT
    // ============================================

    public ResponseEntity<?> getAllUsers(String status, int page, int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            Page<User> usersPage;

            if ("all".equals(status)) {
                usersPage = userRepository.findAll(pageable);
            } else {
                usersPage = userRepository.findByStatus(status.toUpperCase(), pageable);
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "users", usersPage.getContent(),
                    "totalPages", usersPage.getTotalPages(),
                    "totalElements", usersPage.getTotalElements(),
                    "currentPage", page
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    public ResponseEntity<?> getUserDetails(Long userId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "User not found"));
            }

            User user = userOpt.get();
            long postCount = postRepository.countByUserId(userId);
            long commentCount = commentRepository.countByUserId(userId);

            Map<String, Object> userDetails = new HashMap<>();
            userDetails.put("user", user);
            userDetails.put("stats", Map.of(
                    "posts", postCount,
                    "comments", commentCount
            ));

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "data", userDetails
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> suspendUser(Long userId, String reason) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "User not found"));
            }

            User user = userOpt.get();
            user.setStatus("SUSPENDED");
            user.setSuspensionReason(reason);
            user.setSuspendedAt(LocalDateTime.now());
            userRepository.save(user);

            logActivity("USER_SUSPENDED", "Suspended user: " + user.getEmail(), userId);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "User suspended successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> restoreUser(Long userId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "User not found"));
            }

            User user = userOpt.get();
            user.setStatus("ACTIVE");
            user.setSuspensionReason(null);
            user.setSuspendedAt(null);
            userRepository.save(user);

            logActivity("USER_RESTORED", "Restored user: " + user.getEmail(), userId);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "User restored successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> deleteUser(Long userId) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "User not found"));
            }

            User user = userOpt.get();
            String email = user.getEmail();

            // First, delete all user's posts and their related data
            List<Post> userPosts = postRepository.findByUser_IdOrderByCreatedAtDesc(userId);
            for (Post post : userPosts) {
                // Delete post likes, saves, reports
                postLikeRepository.deleteByPostId(post.getId());
                savedPostRepository.deleteByPostId(post.getId());
                postReportRepository.deleteByPostId(post.getId());

                // Delete post comments
                List<Comment> postComments = commentRepository.findByPostId(post.getId());
                commentRepository.deleteAll(postComments);

                // Delete post files from Cloudinary
                deletePostFilesFromCloudinary(post);

                // Delete the post
                postRepository.delete(post);
            }

            // Delete user's comments on other posts
            List<Comment> userComments = commentRepository.findByUserId(userId);
            for (Comment comment : userComments) {
                // Update post comment count
                Post post = comment.getPost();
                post.decrementComments();
                postRepository.save(post);
            }
            commentRepository.deleteAll(userComments);

            // Delete user's activity logs
            activityLogRepository.deleteByUserId(userId);

            // Finally delete the user
            userRepository.delete(user);

            logActivity("USER_DELETED", "Permanently deleted user: " + email, null);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "User deleted successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    public ResponseEntity<?> searchUsers(String query) {
        try {
            List<User> users = userRepository.findByFirstNameContainingOrLastNameContainingOrEmailContaining(
                    query, query, query);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "users", users
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // ============================================
    // POST MANAGEMENT
    // ============================================

    public ResponseEntity<?> getAllPosts(String status, int page, int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            Page<Post> postsPage;

            if ("all".equals(status)) {
                postsPage = postRepository.findAll(pageable);
            } else {
                postsPage = postRepository.findByStatus(status.toUpperCase(), pageable);
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "posts", postsPage.getContent(),
                    "totalPages", postsPage.getTotalPages(),
                    "totalElements", postsPage.getTotalElements(),
                    "currentPage", page
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    public ResponseEntity<?> getPostDetails(Long postId) {
        try {
            Optional<Post> postOpt = postRepository.findById(postId);
            if (postOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post not found"));
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "post", postOpt.get()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // ADDED: Search posts method
    public ResponseEntity<?> searchPosts(String query) {
        try {
            // Use the simpler repository method
            List<Post> posts = postRepository.findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(query, query);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "posts", posts
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
    @Transactional
    public ResponseEntity<?> approvePost(Long postId) {
        try {
            Optional<Post> postOpt = postRepository.findById(postId);
            if (postOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post not found"));
            }

            Post post = postOpt.get();
            post.setStatus("PUBLISHED");
            postRepository.save(post);

            logActivity("POST_APPROVED", "Approved post #" + postId, post.getUser().getId());

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Post approved successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> flagPost(Long postId, String reason) {
        try {
            Optional<Post> postOpt = postRepository.findById(postId);
            if (postOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post not found"));
            }

            Post post = postOpt.get();
            post.setStatus("FLAGGED");
            post.setFlagReason(reason);
            postRepository.save(post);

            logActivity("POST_FLAGGED", "Flagged post #" + postId + ": " + reason, post.getUser().getId());

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Post flagged successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> deletePostByAdmin(Long postId) {
        try {
            Optional<Post> postOpt = postRepository.findById(postId);
            if (postOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post not found"));
            }

            Post post = postOpt.get();
            deletePostFilesFromCloudinary(post);

            // Delete related data first
            postLikeRepository.deleteByPostId(postId);
            savedPostRepository.deleteByPostId(postId);
            postReportRepository.deleteByPostId(postId);
            commentRepository.deleteByPostId(postId);

            // Then delete the post
            postRepository.delete(post);

            logActivity("POST_DELETED", "Deleted post #" + postId + " by admin", post.getUser().getId());

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Post deleted successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // ============================================
    // COMMENT MANAGEMENT
    // ============================================

    public ResponseEntity<?> getAllComments(int page, int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            Page<Comment> commentsPage = commentRepository.findAll(pageable);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "comments", commentsPage.getContent(),
                    "totalPages", commentsPage.getTotalPages(),
                    "totalElements", commentsPage.getTotalElements(),
                    "currentPage", page
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    public ResponseEntity<?> getCommentDetails(Long commentId) {
        try {
            Optional<Comment> commentOpt = commentRepository.findById(commentId);
            if (commentOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Comment not found"));
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "comment", commentOpt.get()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> deleteCommentByAdmin(Long commentId) {
        try {
            Optional<Comment> commentOpt = commentRepository.findById(commentId);
            if (commentOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Comment not found"));
            }

            Comment comment = commentOpt.get();
            Post post = comment.getPost();
            Long userId = comment.getUser().getId();

            commentRepository.delete(comment);
            post.decrementComments();
            postRepository.save(post);

            logActivity("COMMENT_DELETED", "Deleted comment #" + commentId + " by admin", userId);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Comment deleted successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // ============================================
    // REPORT MANAGEMENT
    // ============================================

    public ResponseEntity<?> getAllReports(String status, int page, int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("reportedAt").descending());
            Page<PostReport> reportsPage;

            if ("all".equals(status)) {
                reportsPage = postReportRepository.findAll(pageable);
            } else {
                reportsPage = postReportRepository.findByStatus(status.toUpperCase(), pageable);
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "reports", reportsPage.getContent(),
                    "totalPages", reportsPage.getTotalPages(),
                    "totalElements", reportsPage.getTotalElements(),
                    "currentPage", page
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    public ResponseEntity<?> getReportDetails(Long reportId) {
        try {
            Optional<PostReport> reportOpt = postReportRepository.findById(reportId);
            if (reportOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Report not found"));
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "report", reportOpt.get()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> resolveReport(Long reportId, String action, String notes) {
        try {
            Optional<PostReport> reportOpt = postReportRepository.findById(reportId);
            if (reportOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Report not found"));
            }

            PostReport report = reportOpt.get();
            report.setStatus("RESOLVED");
            report.setResolutionAction(action);
            report.setResolutionNotes(notes);
            report.setResolvedAt(LocalDateTime.now());
            postReportRepository.save(report);

            if ("remove_content".equals(action)) {
                deletePostByAdmin(report.getPost().getId());
            }

            logActivity("REPORT_RESOLVED", "Resolved report #" + reportId + " - Action: " + action, report.getUser().getId());

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Report resolved successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> dismissReport(Long reportId) {
        try {
            Optional<PostReport> reportOpt = postReportRepository.findById(reportId);
            if (reportOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Report not found"));
            }

            PostReport report = reportOpt.get();
            report.setStatus("DISMISSED");
            report.setResolvedAt(LocalDateTime.now());
            postReportRepository.save(report);

            logActivity("REPORT_DISMISSED", "Dismissed report #" + reportId, report.getUser().getId());

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Report dismissed successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // ============================================
    // ACTIVITY LOGS
    // ============================================

    public ResponseEntity<?> getActivityLogs(int page, int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
            Page<ActivityLog> logsPage = activityLogRepository.findAll(pageable);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "logs", logsPage.getContent(),
                    "totalPages", logsPage.getTotalPages(),
                    "totalElements", logsPage.getTotalElements(),
                    "currentPage", page
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // FIXED: Get real client IP address
    private String getClientIP() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getHeader("Proxy-Client-IP");
                }
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getHeader("WL-Proxy-Client-IP");
                }
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getRemoteAddr();
                }
                return ip;
            }
        } catch (Exception e) {
            // If we can't get the IP, return a fallback
        }
        return "Unknown";
    }

    private void logActivity(String action, String description, Long userId) {
        try {
            ActivityLog log = new ActivityLog();
            log.setAction(action);
            log.setDescription(description);
            log.setId(userId);
            log.setIpAddress(getClientIP()); // Now gets real IP
            log.setTimestamp(LocalDateTime.now());
            activityLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("Failed to log activity: " + e.getMessage());
        }
    }

    // ============================================
    // SYSTEM SETTINGS
    // ============================================

    public ResponseEntity<?> getSystemSettings() {
        try {
            Map<String, Object> settings = new HashMap<>();
            settings.put("siteName", "ShareView");
            settings.put("maintenanceMode", false);
            settings.put("registrationEnabled", true);
            settings.put("maxUploadSize", 10485760); // 10MB

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "settings", settings
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    public ResponseEntity<?> updateSystemSettings(Map<String, Object> settings) {
        try {
            // In a real application, save these settings to database
            logActivity("SETTINGS_UPDATED", "System settings updated", null);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Settings updated successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private void deletePostFilesFromCloudinary(Post post) {
        if (post.hasImages()) {
            for (String imageUrl : post.getImageUrlList()) {
                try {
                    String publicId = cloudinaryService.extractPublicId(imageUrl);
                    if (publicId != null) {
                        cloudinaryService.deleteFile(publicId, "image");
                    }
                } catch (Exception e) {
                    System.err.println("Failed to delete image: " + e.getMessage());
                }
            }
        }

        if (post.hasDocuments()) {
            for (String documentUrl : post.getDocumentUrlList()) {
                try {
                    String publicId = cloudinaryService.extractPublicId(documentUrl);
                    if (publicId != null) {
                        cloudinaryService.deleteFile(publicId, "raw");
                    }
                } catch (Exception e) {
                    System.err.println("Failed to delete document: " + e.getMessage());
                }
            }
        }

        if (post.hasVideos()) {
            for (String videoUrl : post.getVideoUrlList()) {
                try {
                    String publicId = cloudinaryService.extractPublicId(videoUrl);
                    if (publicId != null) {
                        cloudinaryService.deleteFile(publicId, "video");
                    }
                } catch (Exception e) {
                    System.err.println("Failed to delete video: " + e.getMessage());
                }
            }
        }
    }
}