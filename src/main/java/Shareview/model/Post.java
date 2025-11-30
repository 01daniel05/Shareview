package Shareview.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "posts")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    // Multiple files support - REMOVE the single file fields
    @Column(name = "image_urls", length = 2000)
    private String imageUrls; // Comma-separated URLs

    @Column(name = "document_urls", length = 2000)
    private String documentUrls;

    @Column(name = "video_urls", length = 2000)
    private String videoUrls;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"password", "posts", "comments", "likes", "savedPosts", "hibernateLazyInitializer", "handler"})
    private User user;

    private int likesCount = 0;
    private int commentsCount = 0;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Comment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<PostLike> likes = new ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<SavedPost> savedBy = new ArrayList<>();

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Post() {}

    // Helper methods for likes and comments
    public void incrementLikes() { this.likesCount++; }
    public void decrementLikes() { this.likesCount = Math.max(0, this.likesCount - 1); }
    public void incrementComments() { this.commentsCount++; }
    public void decrementComments() { this.commentsCount = Math.max(0, this.commentsCount - 1); }

    // Enhanced helper methods to get as lists
    public List<String> getImageUrlList() {
        if (imageUrls == null || imageUrls.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return Arrays.asList(imageUrls.split(","));
    }

    public List<String> getDocumentUrlList() {
        if (documentUrls == null || documentUrls.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return Arrays.asList(documentUrls.split(","));
    }

    public List<String> getVideoUrlList() {
        if (videoUrls == null || videoUrls.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return Arrays.asList(videoUrls.split(","));
    }

    // Helper methods to check if post has files
    public boolean hasImages() {
        return imageUrls != null && !imageUrls.trim().isEmpty();
    }

    public boolean hasDocuments() {
        return documentUrls != null && !documentUrls.trim().isEmpty();
    }

    public boolean hasVideos() {
        return videoUrls != null && !videoUrls.trim().isEmpty();
    }

    // Helper method to get total file count
    public int getTotalFileCount() {
        return getImageUrlList().size() + getDocumentUrlList().size() + getVideoUrlList().size();
    }
}