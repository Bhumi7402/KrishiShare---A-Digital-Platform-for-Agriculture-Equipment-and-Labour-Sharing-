package com.agrishare.api;

import com.agrishare.domain.Task;
import com.agrishare.domain.User;
import com.agrishare.repository.TaskRepository;
import com.agrishare.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskRepository tasks;
    private final UserRepository users;

    public TaskController(TaskRepository tasks, UserRepository users) {
        this.tasks = tasks;
        this.users = users;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(Authentication authentication, @Valid @RequestBody CreateTaskRequest request) {
        User farmer = users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Task task = tasks.save(new Task(farmer, request.crop(), request.taskType(), request.landArea(),
                request.unit() == null ? "ACRE" : request.unit(), request.requiredWorkers(),
                request.requiredEquipment(), request.preferredDate()));
        return toResponse(task);
    }

    @GetMapping("/my")
    public List<TaskResponse> mine(Authentication authentication) {
        return tasks.findByFarmerEmailIgnoreCaseOrderByCreatedAtDesc(authentication.getName())
                .stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public TaskResponse get(Authentication authentication, @PathVariable Long id) {
        Task task = tasks.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        if (!task.getFarmer().getEmail().equalsIgnoreCase(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return toResponse(task);
    }

    private TaskResponse toResponse(Task task) {
        return new TaskResponse(task.getId(), task.getCrop(), task.getTaskType(), task.getLandArea(),
                task.getUnit(), task.getRequiredWorkers(), task.getRequiredEquipment(), task.getPreferredDate());
    }

    public record CreateTaskRequest(@NotBlank String crop, @NotBlank String taskType,
                                    @NotNull @Positive BigDecimal landArea, String unit,
                                    Integer requiredWorkers, String requiredEquipment,
                                    LocalDate preferredDate) {}
    public record TaskResponse(Long id, String crop, String taskType, BigDecimal landArea,
                               String unit, Integer requiredWorkers, String requiredEquipment,
                               LocalDate preferredDate) {}
}
