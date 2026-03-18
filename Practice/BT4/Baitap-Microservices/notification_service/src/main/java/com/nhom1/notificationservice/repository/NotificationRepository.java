package com.nhom1.notificationservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.nhom1.notificationservice.entity.NotificationDocument;

public interface NotificationRepository extends MongoRepository<NotificationDocument, String> {
}
