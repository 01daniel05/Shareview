package Shareview.repository;

import Shareview.model.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    // In ActivityLogRepository.java, add:
    @Query("SELECT COUNT(a) FROM ActivityLog a WHERE a.timestamp >= :startDate")
    long countByTimestampAfter(@Param("startDate") LocalDateTime startDate);
    Page<ActivityLog> findAll(Pageable pageable);

    List<ActivityLog> findByAction(String action);

    List<ActivityLog> findByUserId(Long userId);

    List<ActivityLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);

    Page<ActivityLog> findByActionContaining(String action, Pageable pageable);

    void deleteByUserId(Long userId);

}