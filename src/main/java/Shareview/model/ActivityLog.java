package Shareview.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String action;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"password", "posts", "comments", "likes", "savedPosts", "hibernateLazyInitializer", "handler"})
    private User user;
    private String ipAddress;

    private LocalDateTime timestamp = LocalDateTime.now();

    // ---------------- Constructors ----------------
    public ActivityLog(User user) {
        this.user = user;
    }

    public ActivityLog(String action, String description, User user, String ipAddress) {
        this.action = action;
        this.description = description;
        this.user = user;
        this.ipAddress = ipAddress;
        this.timestamp = LocalDateTime.now();
    }

    public ActivityLog() {

    }

    // ---------------- Getters and Setters ----------------
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }
    public void setUser(User user) {
        this.user = user;
    }
    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    public enum UserStatus { ACTIVE, SUSPENDED, DELETED }
    public enum PostStatus { PUBLISHED, FLAGGED, PENDING, REMOVED }
    public enum ReportStatus { PENDING, RESOLVED, DISMISSED }

}