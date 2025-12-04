package Shareview.repository;

import Shareview.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    @Query("SELECT p FROM Post p JOIN FETCH p.user u ORDER BY p.createdAt DESC")
    List<Post> findAllWithUserOrderByCreatedAtDesc();

    List<Post> findByUser_IdOrderByCreatedAtDesc(Long userId);

    List<Post> findTop10ByOrderByCreatedAtDesc();

    @Query("SELECT p FROM Post p JOIN SavedPost sp ON p.id = sp.post.id WHERE sp.user.id = :userId ORDER BY sp.savedAt DESC")
    List<Post> findSavedPostsByUserId(@Param("userId") Long userId);

    @Query("SELECT p FROM Post p JOIN PostLike pl ON p.id = pl.post.id WHERE pl.user.id = :userId ORDER BY pl.id DESC")
    List<Post> findLikedPostsByUserId(@Param("userId") Long userId);

    // New methods for admin dashboard
    Page<Post> findByStatus(String status, Pageable pageable);

    long countByStatus(String status);

    long countByUserId(Long userId);

    @Query("SELECT COUNT(p) FROM Post p WHERE p.createdAt >= :startDate")
    long countPostsSince(@Param("startDate") java.time.LocalDateTime startDate);
    List<Post> findByTitleContainingIgnoreCaseOrContentContainingIgnoreCase(String title, String content);

}