package Shareview.repository;

import Shareview.model.PostReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostReportRepository extends JpaRepository<PostReport, Long> {

    Optional<PostReport> findByUser_IdAndPost_Id(Long userId, Long postId);

    @Modifying
    @Query("DELETE FROM PostReport pr WHERE pr.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}