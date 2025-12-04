package Shareview.repository;

import Shareview.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByRole(String role);

    long countByRole(String role);

    List<User> findByFirstNameContainingOrLastNameContainingOrEmailContaining(
            String firstName, String lastName, String email);

    // New methods for admin dashboard
    Page<User> findByStatus(String status, Pageable pageable);

    long countByStatus(String status);

    List<User> findTop10ByOrderByCreatedAtDesc();
}