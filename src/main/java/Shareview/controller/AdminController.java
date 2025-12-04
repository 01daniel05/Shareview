package Shareview.controller;

import Shareview.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")  // Added security annotation
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ============================================
    // DASHBOARD STATISTICS
    // ============================================

    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        return adminService.getDashboardStats();
    }

    // ============================================
    // USER MANAGEMENT
    // ============================================

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(
            @RequestParam(defaultValue = "all") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return adminService.getAllUsers(status, page, size);
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUserDetails(@PathVariable Long userId) {
        return adminService.getUserDetails(userId);
    }

    @PutMapping("/users/{userId}/suspend")
    public ResponseEntity<?> suspendUser(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request) {
        String reason = request.get("reason");
        return adminService.suspendUser(userId, reason);
    }

    @PutMapping("/users/{userId}/restore")
    public ResponseEntity<?> restoreUser(@PathVariable Long userId) {
        return adminService.restoreUser(userId);
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        return adminService.deleteUser(userId);
    }

    @GetMapping("/users/search")
    public ResponseEntity<?> searchUsers(@RequestParam String query) {
        return adminService.searchUsers(query);
    }

    // ============================================
    // POST MANAGEMENT
    // ============================================

    @GetMapping("/posts")
    public ResponseEntity<?> getAllPosts(
            @RequestParam(defaultValue = "all") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return adminService.getAllPosts(status, page, size);
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<?> getPostDetails(@PathVariable Long postId) {
        return adminService.getPostDetails(postId);
    }

    @GetMapping("/posts/search")  // ADDED: Missing endpoint
    public ResponseEntity<?> searchPosts(@RequestParam String query) {
        return adminService.searchPosts(query);
    }

    @PutMapping("/posts/{postId}/approve")
    public ResponseEntity<?> approvePost(@PathVariable Long postId) {
        return adminService.approvePost(postId);
    }

    @PutMapping("/posts/{postId}/flag")
    public ResponseEntity<?> flagPost(
            @PathVariable Long postId,
            @RequestBody Map<String, String> request) {
        String reason = request.get("reason");
        return adminService.flagPost(postId, reason);
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<?> deletePostByAdmin(@PathVariable Long postId) {
        return adminService.deletePostByAdmin(postId);
    }

    // ============================================
    // COMMENT MANAGEMENT
    // ============================================

    @GetMapping("/comments")
    public ResponseEntity<?> getAllComments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return adminService.getAllComments(page, size);
    }

    @GetMapping("/comments/{commentId}")
    public ResponseEntity<?> getCommentDetails(@PathVariable Long commentId) {
        return adminService.getCommentDetails(commentId);
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteCommentByAdmin(@PathVariable Long commentId) {
        return adminService.deleteCommentByAdmin(commentId);
    }

    // ============================================
    // REPORT MANAGEMENT
    // ============================================

    @GetMapping("/reports")
    public ResponseEntity<?> getAllReports(
            @RequestParam(defaultValue = "pending") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return adminService.getAllReports(status, page, size);
    }

    @GetMapping("/reports/{reportId}")
    public ResponseEntity<?> getReportDetails(@PathVariable Long reportId) {
        return adminService.getReportDetails(reportId);
    }

    @PutMapping("/reports/{reportId}/resolve")
    public ResponseEntity<?> resolveReport(
            @PathVariable Long reportId,
            @RequestBody Map<String, String> request) {
        String action = request.get("action");
        String notes = request.get("notes");
        return adminService.resolveReport(reportId, action, notes);
    }

    @PutMapping("/reports/{reportId}/dismiss")
    public ResponseEntity<?> dismissReport(@PathVariable Long reportId) {
        return adminService.dismissReport(reportId);
    }

    // ============================================
    // ACTIVITY LOGS
    // ============================================

    @GetMapping("/logs")
    public ResponseEntity<?> getActivityLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminService.getActivityLogs(page, size);
    }

    // ============================================
    // SYSTEM SETTINGS
    // ============================================

    @GetMapping("/settings")
    public ResponseEntity<?> getSystemSettings() {
        return adminService.getSystemSettings();
    }

    @PutMapping("/settings")
    public ResponseEntity<?> updateSystemSettings(@RequestBody Map<String, Object> settings) {
        return adminService.updateSystemSettings(settings);
    }
}