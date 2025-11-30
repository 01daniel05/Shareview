package Shareview.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

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

    @Column(name = "image_urls", length = 2000)
    private String imageUrls;

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

    // ---------------- Constructors ----------------
    public Post() {}

    // ---------------- Getters and Setters ----------------
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getImageUrls() { return imageUrls; }
    public void setImageUrls(String imageUrls) { this.imageUrls = imageUrls; }

    public String getDocumentUrls() { return documentUrls; }
    public void setDocumentUrls(String documentUrls) { this.documentUrls = documentUrls; }

    public String getVideoUrls() { return videoUrls; }
    public void setVideoUrls(String videoUrls) { this.videoUrls = videoUrls; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public int getLikesCount() { return likesCount; }
    public void setLikesCount(int likesCount) { this.likesCount = likesCount; }

    public int getCommentsCount() { return commentsCount; }
    public void setCommentsCount(int commentsCount) { this.commentsCount = commentsCount; }

    public List<Comment> getComments() { return comments; }
    public void setComments(List<Comment> comments) { this.comments = comments; }

    public List<PostLike> getLikes() { return likes; }
    public void setLikes(List<PostLike> likes) { this.likes = likes; }

    public List<SavedPost> getSavedBy() { return savedBy; }
    public void setSavedBy(List<SavedPost> savedBy) { this.savedBy = savedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // ---------------- Helper Methods ----------------
    public void incrementLikes() { this.likesCount++; }
    public void decrementLikes() { this.likesCount = Math.max(0, this.likesCount - 1); }
    public void incrementComments() { this.commentsCount++; }
    public void decrementComments() { this.commentsCount = Math.max(0, this.commentsCount - 1); }

    public List<String> getImageUrlList() {
        if (imageUrls == null || imageUrls.trim().isEmpty()) return new ArrayList<>();
        return Arrays.asList(imageUrls.split(","));
    }

    public List<String> getDocumentUrlList() {
        if (documentUrls == null || documentUrls.trim().isEmpty()) return new ArrayList<>();
        return Arrays.asList(documentUrls.split(","));
    }

    public List<String> getVideoUrlList() {
        if (videoUrls == null || videoUrls.trim().isEmpty()) return new ArrayList<>();
        return Arrays.asList(videoUrls.split(","));
    }

    public boolean hasImages() { return imageUrls != null && !imageUrls.trim().isEmpty(); }
    public boolean hasDocuments() { return documentUrls != null && !documentUrls.trim().isEmpty(); }
    public boolean hasVideos() { return videoUrls != null && !videoUrls.trim().isEmpty(); }

    public int getTotalFileCount() {
        return getImageUrlList().size() + getDocumentUrlList().size() + getVideoUrlList().size();
    }
}
