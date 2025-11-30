package Shareview.service;

import Shareview.model.Comment;
import Shareview.model.Post;
import Shareview.model.User;
import Shareview.repository.CommentRepository;
import Shareview.repository.PostRepository;
import Shareview.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public CommentService(CommentRepository commentRepository,
                          PostRepository postRepository,
                          UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    public ResponseEntity<?> getCommentsByPost(Long postId) {
        try {
            Optional<Post> postOpt = postRepository.findById(postId);
            if (postOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post not found"));
            }

            List<Comment> comments = commentRepository.findByPost_IdOrderByCreatedAtDesc(postId);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "comments", comments,
                    "count", comments.size()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to load comments: " + e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> addComment(Long postId, Long userId, String content) {
        try {
            if (content == null || content.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("status", "error", "message", "Comment content cannot be empty"));
            }

            Optional<Post> postOpt = postRepository.findById(postId);
            if (postOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Post not found"));
            }

            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "User not found"));
            }

            Post post = postOpt.get();
            User user = userOpt.get();

            Comment comment = new Comment();
            comment.setContent(content.trim());
            comment.setPost(post);
            comment.setUser(user);

            Comment savedComment = commentRepository.save(comment);

            // Update post comment count
            post.incrementComments();
            postRepository.save(post);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "status", "success",
                            "message", "Comment added successfully",
                            "comment", savedComment
                    ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to add comment: " + e.getMessage()));
        }
    }

    @Transactional
    public ResponseEntity<?> deleteComment(Long commentId) {
        try {
            Optional<Comment> commentOpt = commentRepository.findById(commentId);
            if (commentOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("status", "error", "message", "Comment not found"));
            }

            Comment comment = commentOpt.get();
            Post post = comment.getPost();

            commentRepository.delete(comment);

            // Update post comment count
            post.decrementComments();
            postRepository.save(post);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Comment deleted successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to delete comment: " + e.getMessage()));
        }
    }
}