package Shareview.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "post_reports", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "post_id"})
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PostReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"password", "posts", "comments", "likes", "savedPosts", "hibernateLazyInitializer", "handler"})
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "post_id", nullable = false)
    @JsonIgnoreProperties({"comments", "likes", "savedBy", "hibernateLazyInitializer", "handler"})
    private Post post;

    @Column(nullable = false)
    private String reason;

    private LocalDateTime reportedAt = LocalDateTime.now();

    // New fields for admin management
    private String status = "PENDING"; // PENDING, RESOLVED, DISMISSED
    private String resolutionAction; // remove_content, warn_user, dismiss
    private String resolutionNotes;
    private LocalDateTime resolvedAt;

    // ---------------- Constructors ----------------
    public PostReport() {}

    public PostReport(User user, Post post, String reason) {
        this.user = user;
        this.post = post;
        this.reason = reason;
        this.reportedAt = LocalDateTime.now();
        this.status = "PENDING";
    }

    // ---------------- Getters and Setters ----------------
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Post getPost() { return post; }
    public void setPost(Post post) { this.post = post; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getReportedAt() { return reportedAt; }
    public void setReportedAt(LocalDateTime reportedAt) { this.reportedAt = reportedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getResolutionAction() { return resolutionAction; }
    public void setResolutionAction(String resolutionAction) { this.resolutionAction = resolutionAction; }

    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    // ---------------- Helper Methods ----------------
    public boolean isPending() {
        return "PENDING".equals(this.status);
    }

    public boolean isResolved() {
        return "RESOLVED".equals(this.status);
    }
}