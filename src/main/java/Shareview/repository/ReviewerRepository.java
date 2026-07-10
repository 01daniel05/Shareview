package Shareview.repository;

import Shareview.model.Reviewer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewerRepository extends JpaRepository<Reviewer, Long> {
    List<Reviewer> findByUserIdOrderByCreatedAtDesc(Long userId);
}