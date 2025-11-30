package Shareview.repository;

import Shareview.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    // Change from findByPost_PostId to findByPost_Id
    List<Comment> findByPost_IdOrderByCreatedAtDesc(Long postId);

    List<Comment> findByUser_IdOrderByCreatedAtDesc(Long userId);
}