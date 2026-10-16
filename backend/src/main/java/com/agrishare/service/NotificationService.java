package com.agrishare.service;

import com.agrishare.domain.Notification;
import com.agrishare.domain.User;
import com.agrishare.repository.NotificationRepository;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
    private final NotificationRepository notifications;

    public NotificationService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    public void send(User user, String type, String message) {
        notifications.save(new Notification(user, type, message));
    }
}
