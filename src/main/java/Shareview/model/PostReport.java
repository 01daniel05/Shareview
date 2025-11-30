package Shareview.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
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

    public PostReport() {}

    public PostReport(User user, Post post, String reason) {
        this.user = user;
        this.post = post;
        this.reason = reason;
        this.reportedAt = LocalDateTime.now();
    }
}