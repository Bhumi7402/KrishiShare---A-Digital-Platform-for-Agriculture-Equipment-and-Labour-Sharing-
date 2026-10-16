package com.agrishare.repository;

import com.agrishare.domain.Task;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByFarmerEmailIgnoreCaseOrderByCreatedAtDesc(String email);
}
