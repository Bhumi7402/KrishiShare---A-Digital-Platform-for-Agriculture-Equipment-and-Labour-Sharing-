package com.agrishare.api;

import com.agrishare.domain.Notification;
import com.agrishare.repository.NotificationRepository;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationRepository notifications;

    public NotificationController(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    public List<NotificationResponse> mine(Authentication authentication) {
        return notifications.findTop50ByUserEmailIgnoreCaseOrderByCreatedAtDesc(authentication.getName())
                .stream().map(notification -> new NotificationResponse(notification.getId(),
                        notification.getType(), notification.getMessage(),
                        notification.isRead(), notification.getCreatedAt())).toList();
    }

    @PostMapping("/read-all")
    public void markAllRead(Authentication authentication) {
        List<Notification> unread = notifications.findByUserEmailIgnoreCaseAndReadFalse(authentication.getName());
        unread.forEach(notification -> notification.setRead(true));
        notifications.saveAll(unread);
    }

    @PostMapping("/{id}/read")
    public NotificationResponse markRead(Authentication authentication, @PathVariable Long id) {
        Notification notification = notifications.findByIdAndUserEmailIgnoreCase(id, authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        notification.setRead(true);
        Notification saved = notifications.save(notification);
        return new NotificationResponse(saved.getId(), saved.getType(), saved.getMessage(),
                saved.isRead(), saved.getCreatedAt());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        Notification notification = notifications.findByIdAndUserEmailIgnoreCase(id, authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        notifications.delete(notification);
    }

    @DeleteMapping("/clear-read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearRead(Authentication authentication) {
        notifications.deleteByUserEmailIgnoreCaseAndReadTrue(authentication.getName());
    }

    public record NotificationResponse(Long id, String type, String message,
                                       boolean read, OffsetDateTime createdAt) {}
}
