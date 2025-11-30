package Shareview.repository;

import Shareview.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    // Use JOIN FETCH to eagerly load user data
    @Query("SELECT p FROM Post p JOIN FETCH p.user u ORDER BY p.createdAt DESC")
    List<Post> findAllWithUserOrderByCreatedAtDesc();

    List<Post> findByUser_IdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT p FROM Post p JOIN SavedPost sp ON p.id = sp.post.id WHERE sp.user.id = :userId ORDER BY sp.savedAt DESC")
    List<Post> findSavedPostsByUserId(@Param("userId") Long userId);

    @Query("SELECT p FROM Post p JOIN PostLike pl ON p.id = pl.post.id WHERE pl.user.id = :userId ORDER BY pl.id DESC")
    List<Post> findLikedPostsByUserId(@Param("userId") Long userId);
}