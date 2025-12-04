package Shareview.repository;

import Shareview.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByPost_IdOrderByCreatedAtDesc(Long postId);

    List<Comment> findTop10ByOrderByCreatedAtDesc();

    List<Comment> findTop50ByOrderByCreatedAtDesc();

    // New methods for admin dashboard
    Page<Comment> findAll(Pageable pageable);

    // Using @Query annotation
    @Query("SELECT COUNT(c) FROM Comment c WHERE c.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM Comment c WHERE c.user.id = :userId")
    List<Comment> findByUserId(@Param("userId") Long userId);

    List<Comment> findByPostId(Long id);

    void deleteByPostId(Long Id);

}