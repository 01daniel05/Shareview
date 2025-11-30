package Shareview.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "saved_posts", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "post_id"})
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SavedPost {
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

    private java.time.LocalDateTime savedAt = java.time.LocalDateTime.now();
}